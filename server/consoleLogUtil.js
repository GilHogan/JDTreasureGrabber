const { BrowserWindow } = require('electron');

function log (...msg) {
    const windows = BrowserWindow.getAllWindows();
    if (!windows) {
        return;
    }
    let currentWindow;
    for (let i = 0; i < windows.length; i++) {
        const win = windows[i];
        console.log("windows = ", win.title)
        if (win.title == "京东夺宝岛助手") {
            currentWindow = win;
            break;
        }
    }
    if (currentWindow) {
        // 获取参数
        const params = msg.map((arg) => {
            if (typeof arg === "string") {
                return arg;
            } else {
                return JSON.stringify(arg);
            }
        });

        const str = params.join(" ");
        currentWindow.webContents && currentWindow.webContents.send("fromMain", { event: "console", data: str });
    }
}

function error (...msg) {
    log(msg);
}
module.exports = { log, error };
