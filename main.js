const { app, BrowserWindow, ipcMain, Menu, MenuItem, dialog, shell } = require('electron');
const path = require('node:path');
const { ipcHandle } = require("./server/ipcHandle");

function createWindow() {
	const iconPath = path.join(__dirname, 'public/favicon.png');
	// 创建浏览器窗口
	const win = new BrowserWindow({
		width: 1350,
		height: 800,
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			enableRemoteModule: false,
			preload: path.join(__dirname, "preload.js") // use a preload script
		},
		icon: iconPath
	});

	const menuItems = Menu.getApplicationMenu().items;
	const helpMenuItem = menuItems.find(item => item.label === "Help");
	if (helpMenuItem) {
		helpMenuItem.submenu.append(new MenuItem({
			label: 'Github',
			click: () => {
				shell.openExternal("https://github.com/GilHogan/JDTreasureGrabber");
			}
		}));
		helpMenuItem.submenu.append(new MenuItem({
			label: 'License',
			click: () => {
				shell.openExternal("https://www.gnu.org/licenses/agpl-3.0.en.html");
			}
		}));
		helpMenuItem.submenu.append(new MenuItem({
			label: 'About',
			click: () => {
				// 在这里添加处理 "About" 点击事件的代码
				const version = app.getVersion();
				const message = `Version: ${version}\r\nAuthor: hogan \r\nLicense: AGPL-3.0`;

				dialog.showMessageBox({
					icon: iconPath,
					title: '京东夺宝岛助手',
					message: message,
					buttons: ['OK'],
					type: 'none'
				});
			}
		}));
	}

	// 并且为你的应用加载index.html
	win.loadFile(path.join(__dirname, "pages/index.html"));

	// 打开开发者工具
	// win.webContents.openDevTools();
}

// ipcRenderer.invoke 处理
ipcMain.handle("toMain", async (e, args) => {
	return await ipcHandle(e, args);
})

// ipcRenderer.on 处理
ipcMain.on("toMain", async (e, args) => {
	if (!args || !args.event) {
		return;
	}
	const data = await ipcHandle(e, args);
	const webContents = e.sender;
	const win = BrowserWindow.fromWebContents(webContents)
	win.webContents.send("fromMain", { event: args.event, data: data });
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
	// 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
	// 否则绝大部分应用及其菜单栏会保持激活。
	if (process.platform !== 'darwin') {
		app.quit()
	}
});

app.on('activate', () => {
	// 在macOS上，当单击dock图标并且没有其他窗口打开时，
	// 通常在应用程序中重新创建一个窗口。
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow()
	}
});