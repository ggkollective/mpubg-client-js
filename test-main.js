// 간단한 테스트용 메인 파일
const { app, BrowserWindow } = require('electron');

function createWindow() {
    console.log('Creating test window...');
    
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
        }
    });

    win.loadFile('index.html');
    
    win.once('ready-to-show', () => {
        console.log('Test window ready to show');
        win.show();
    });

    console.log('Test window created');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

console.log('Test main.js loaded');
