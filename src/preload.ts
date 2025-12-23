// preload.ts
// Preload script for Electron renderer process

import { contextBridge, ipcRenderer } from 'electron';

// Conditionally load scripts based on the current window
// Note: With nodeIntegration: false, we cannot use require() in preload
// Instead, we'll expose the window type information to the renderer
const currentUrl = window.location.href;
console.log('currentUrl=', currentUrl);

let windowType = 'unknown';
if (currentUrl.includes('main-window.html')) {
    windowType = 'main-window';
} else if (currentUrl.includes('livestanding.html')) {
    windowType = 'livestanding';
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
    send: (channel: string, data: any) => {
        // whitelist channels
        const validChannels = ["toMain"];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    receive: (channel: string, func: (...args: any[]) => void) => {
        const validChannels = ["fromMain", "observer-data-update"];
        if (validChannels.includes(channel)) {
            // Deliberately strip event as it includes `sender`
            ipcRenderer.on(channel, (_event, ...args) => func(...args));
        }
    },
    invoke: (channel: string, ...args: any[]) => {
        // whitelist channels for invoke
        const validChannels = [
            "toggle-livestanding",
            "start-test-data-stream",
            "stop-test-data-stream",
            "get-test-data-stream-status"
        ];
        console.log('API invoke called with channel:', channel);
        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
        throw new Error(`Channel '${channel}' is not allowed`);
    }
};

// contextBridge를 사용하여 안전하게 API 노출
contextBridge.exposeInMainWorld('api', {
    ...api,
    windowType: windowType // 윈도우 타입 정보도 함께 노출
});
console.log('contextBridge API setup complete for window type:', windowType);
