// Simple test to check if Electron main process can start
import { app, BrowserWindow } from 'electron';

console.log('Electron test starting...');

app.whenReady().then(() => {
    console.log('Electron app ready');

    const win = new BrowserWindow({
        width: 400,
        height: 300,
        show: false
    });

    console.log('BrowserWindow created');

    // Close immediately
    setTimeout(() => {
        win.close();
        app.quit();
        console.log('Test completed successfully');
    }, 1000);
});
