const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win;
const dataFilePath = path.join(__dirname, 'data', 'centres.json');

function createWindow() {
    win = new BrowserWindow({
        width: 1200,
        height: 900,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js') // utiliser preload pour ipcRenderer sécurisé
        }
    });

    win.loadFile('index.html');
}

// Lecture fichier JSON
function readData() {
    try {
        const raw = fs.readFileSync(dataFilePath);
        return JSON.parse(raw);
    } catch (e) {
        console.error("Erreur lecture fichier JSON:", e);
        return { departements: {}, effectifsParType: {} };
    }
}

// Écriture fichier JSON
function writeData(data) {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error("Erreur écriture fichier JSON:", e);
        return false;
    }
}

app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('get-data', () => {
        return readData();
    });

    ipcMain.handle('save-data', (event, newData) => {
        return writeData(newData);
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) create
