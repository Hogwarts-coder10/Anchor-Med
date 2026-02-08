const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isDev = !app.isPackaged;
  
  // 1. DEFINE THE HOME BASE
  // In Prod, this is the 'resources' folder inside the installed app
  const homeDir = isDev ? __dirname : process.resourcesPath;
  
  // 2. DEFINE THE EXECUTABLE PATH
  const backendPath = path.join(homeDir, 'backend.exe');

  console.log("Launching Backend...");
  console.log("Home Directory (CWD):", homeDir);
  console.log("Executable:", backendPath);

  // 3. CRITICAL: FORCE THE CWD
  // This ensures Python looks for 'data/' inside 'resources/'
  backendProcess = spawn(backendPath, [], { cwd: homeDir });

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
    webPreferences: { nodeIntegration: true, contextIsolation: false },
    // Fixes the "White Screen" if Python crashes early
    backgroundColor: '#09090b' 
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }
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
