const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process'); // Import the process spawner

let pythonProcess = null; // Variable to keep track of the backend

function startPythonBackend() {
  let scriptPath;
  
  if (app.isPackaged) {
    // IN PRODUCTION: The exe is stored in a special 'resources' folder
    scriptPath = path.join(process.resourcesPath, 'backend.exe');
  } else {
    // IN DEVELOPMENT: The exe is right here in the folder
    scriptPath = path.join(__dirname, 'backend.exe');
  }

  console.log("Launching backend from:", scriptPath);

  // Spawn the process (detached means it runs independently but we track it)
  if (require('fs').existsSync(scriptPath)) {
    pythonProcess = spawn(scriptPath, [], { stdio: 'ignore' });
  } else {
    console.error("Backend executable not found!");
  }
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(() => {
  startPythonBackend(); // <--- START THE ENGINE
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// KILL THE ENGINE WHEN APP CLOSES
app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill(); 
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});