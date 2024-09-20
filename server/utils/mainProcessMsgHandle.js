const { BrowserWindow } = require('electron');

/**
 * 主进程发生事件到渲染进程
 */
function mainSendToRender(event, data) {
    try {
        const windows = BrowserWindow.getAllWindows();
        if (!windows) {
            return;
        }
        let currentWindow;
        for (let i = 0; i < windows.length; i++) {
            const win = windows[i];
            if (win && win.title == "京东夺宝岛助手") {
                currentWindow = win;
                break;
            }
        }
        if (currentWindow) {
            currentWindow.webContents && currentWindow.webContents.send("fromMain", { event: event, data: data });
        }
    } catch (error) {

    }
}

module.exports = { mainSendToRender };
