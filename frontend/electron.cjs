const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isDev = !app.isPackaged;
  
  // 1. DEFINE THE EXECUTABLE PATH
  // In dev: It's right next to this file in the frontend folder
  // In prod: It gets packed into the hidden resources folder
  const backendPath = isDev 
    ? path.join(__dirname, 'backend.exe')
    : path.join(process.resourcesPath, 'backend.exe');

  console.log("Launching Backend...");
  console.log("Executable:", backendPath);

  // 2. CRITICAL: FORCE THE CWD
  // Lock the working directory to wherever the executable lives
  const workingDir = path.dirname(backendPath);
  backendProcess = spawn(backendPath, [], { cwd: workingDir });

  backendProcess.stdout.on('data', (data) => console.log(`[Python] ${data}`));
  backendProcess.stderr.on('data', (data) => console.error(`[Python ERR] ${data}`));
}

// ASYNC KILLER 
async function killBackend() {
  if (!backendProcess) return;
  console.log("[Anchor] Terminating Backend...");

  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // /F = Force, /T = Tree, /B = No Window
      exec(`taskkill /F /T /PID ${backendProcess.pid}`, () => {
         console.log("[Anchor] Backend Killed via TaskKill");
         resolve();
      });
    } else {
      backendProcess.kill();
      resolve();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    icon: path.join(__dirname, 'icon.ico'), // MATCHED TO PACKAGE.JSON
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    backgroundColor: '#09090b' 
  });

  mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

// 5. PROPER ASYNC SHUTDOWN
app.on('window-all-closed', async () => {
  await killBackend(); // Wait for the kill to finish
  if (process.platform !== 'darwin') app.quit();
});
