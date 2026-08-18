const {
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    clipboard,
    nativeImage
} = require("electron");
const {
    autoUpdater
} = require("electron-updater");
const path = require("path");

app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling,MediaSessionService");
app.commandLine.appendSwitch("disable-background-timer-throttling");
app.commandLine.appendSwitch("disable-renderer-backgrounding");
app.commandLine.appendSwitch("disable-backgrounding-occluded-windows");
app.commandLine.appendSwitch("js-flags", "--max-old-space-size=256");

const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");

const DEFAULT_SETTINGS = {
    // zoom
    "zoom.enabled": false,
    "zoom.level": 0.35,
    "zoom.keybind": "KeyV",
    // adblocker
    "adblocker.enabled": false,
    // rpc
    "rpc.enabled": true,
    "rpc.hideroom": false,
    // custom crosshair
    "crosshair.enabled": false,
    "crosshair.url": "",
    "crosshair.size": 32,
    "crosshair.opacity": 1.0,
    // texture pack
    "textures.enabled": false,
    "textures.pack": {},
    // keystrokes
    "keystrokes.enabled": false,
    "keystrokes.showCPS": true,
    "keystrokes.shadow": true,
    "keystrokes.border": false,
    "keystrokes.borderWidth": 1,
    "keystrokes.borderColor": "#ffffff",
    "keystrokes.scale": 1.0,
    "keystrokes.x": 20,
    "keystrokes.y": 40,
    "keystrokes.bgColor": "#00000088",
    "keystrokes.bgPressColor": "#ffffff",
    "keystrokes.textColor": "#ffffff",
    "keystrokes.textPressColor": "#000000",
    // client settings
    "client.keybind": "KeyG",
    "client.sandbox": false,
    "client.autofullscreen": true,
};

let gameWin = null;
let splashWin = null;
let rpcModule = null;

let _settingsCache = null;
let _settingsCacheTime = 0;

function loadSettings() {
    const now = Date.now();
    if (_settingsCache && now - _settingsCacheTime < 1000) {
        return _settingsCache;
    }
    try {
        const fs = require("fs");
        if (!fs.existsSync(SETTINGS_FILE)) {
            _settingsCache = {
                ...DEFAULT_SETTINGS
            };
        } else {
            _settingsCache = {
                ...DEFAULT_SETTINGS,
                ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"))
            };
        }
    } catch (e) {
        _settingsCache = {
            ...DEFAULT_SETTINGS
        };
    }
    _settingsCacheTime = now;
    return _settingsCache;
}

function saveSettings(settings) {
    _settingsCache = {
        ...settings
    };
    _settingsCacheTime = Date.now();
    require("fs").writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

function splashStatus(msg) {
    if (splashWin && !splashWin.isDestroyed()) {
        splashWin.webContents.send("splash-status", msg);
    }
}

function splashProgress(pct) {
    if (splashWin && !splashWin.isDestroyed()) {
        splashWin.webContents.send("splash-progress", pct);
    }
}

function initRPC() {
    const settings = loadSettings();
    if (!settings["rpc.enabled"]) return;
    if (rpcModule) return;
    try {
        rpcModule = require("./utils/rpc");
    } catch (e) {
        console.log("[Matrix Client] RPC failed:", e.message);
    }
}

function createSplash() {
    splashWin = new BrowserWindow({
        width: 420,
        height: 240,
        frame: false,
        transparent: true,
        resizable: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, "assets/icon.png"),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });
    splashWin.loadFile("src/splash/splash.html");
}

function createGame() {
    gameWin = new BrowserWindow({
        width: 1280,
        height: 720,
        show: false,
        title: "Matrix Client",
        icon: path.join(__dirname, "assets/icon.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: false,
            nodeIntegration: false,
            backgroundThrottling: false,
            devTools: true,
            spellcheck: false,
            enableWebSQL: false,
            autoplayPolicy: "no-user-gesture-required",
        }
    });

    gameWin.webContents.session.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );

    gameWin.webContents.session.webRequest.onBeforeRequest({
            urls: ["*://*/*"]
        },
        function(details, callback) {
            const url = details.url || "";
            const settings = loadSettings();
            if (settings["adblocker.enabled"] && isAdURL(url)) {
                callback({
                    cancel: true
                });
            } else {
                callback({
                    cancel: false
                });
            }
        }
    );

    gameWin.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        const headers = details.responseHeaders;
        delete headers["content-security-policy"];
        delete headers["content-security-policy-report-only"];
        delete headers["require-trusted-types-for"];
        callback({
            responseHeaders: headers
        });
    });

    const settings = loadSettings();
    const startURL = settings["client.sandbox"] ?
        "https://sandbox.minefun.io" :
        "https://minefun.io";

    gameWin.loadURL(startURL);

    gameWin.webContents.on("did-finish-load", async () => {
        try {
            await inject(gameWin.webContents);
        } catch (e) {
            console.error("[Matrix Client] Injection failed:", e.message);
        }
        if (splashWin && !splashWin.isDestroyed()) {
            splashWin.close();
            splashWin = null;
        }
        gameWin.show();

        const s = loadSettings();
        if (s["client.autofullscreen"]) {
            gameWin.setFullScreen(true);
        }
    });

    gameWin.on("page-title-updated", e => e.preventDefault());
    gameWin.on("close", () => gameWin.destroy());
}

function checkForUpdates() {
    return new Promise((resolve) => {
        if (!app.isPackaged) {
            splashStatus("Skipping update check");
            splashProgress(100);
            setTimeout(resolve, 800);
            return;
        }

        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = false;

        autoUpdater.on("checking-for-update", () => {
            splashStatus("Checking for updates…");
            splashProgress(10);
        });
        autoUpdater.on("update-not-available", () => {
            splashStatus("Up to date!");
            splashProgress(100);
            setTimeout(resolve, 600);
        });
        autoUpdater.on("update-available", (info) => {
            splashStatus(`Update v${info.version} found — downloading…`);
            splashProgress(20);
        });
        autoUpdater.on("download-progress", (progress) => {
            const pct = Math.round(progress.percent);
            splashStatus(`Downloading update… ${pct}%`);
            splashProgress(20 + Math.round(pct * 0.75));
        });
        autoUpdater.on("update-downloaded", () => {
            splashStatus("Update ready — restarting…");
            splashProgress(100);
            setTimeout(() => autoUpdater.quitAndInstall(false, true), 1500);
        });
        autoUpdater.on("error", (err) => {
            console.error("[Updater]", err.message);
            splashStatus("Could not check for updates — launching");
            splashProgress(100);
            setTimeout(resolve, 800);
        });
        autoUpdater.checkForUpdates().catch(() => {
            splashStatus("Update check failed — launching");
            splashProgress(100);
            setTimeout(resolve, 800);
        });
    });
}

async function inject(wc) {
    const fs = require("fs");
    const settings = loadSettings();

    await wc.executeJavaScript(`
        window.__mfSettings.zoom             = ${JSON.stringify(!!settings["zoom.enabled"])};
        window.__mfSettings.zoomLevel        = ${JSON.stringify(settings["zoom.level"]        ?? 0.35)};
        window.__mfSettings.zoomKeybind      = ${JSON.stringify(settings["zoom.keybind"]      ?? "KeyV")};
        window.__mfSettings.adblocker        = ${JSON.stringify(!!settings["adblocker.enabled"])};
        window.__mfSettings.crosshair        = ${JSON.stringify(!!settings["crosshair.enabled"])};
        window.__mfSettings.crosshairURL     = ${JSON.stringify(settings["crosshair.url"]     ?? "")};
        window.__mfSettings.crosshairSize    = ${JSON.stringify(settings["crosshair.size"]    ?? 32)};
        window.__mfSettings.crosshairOpacity = ${JSON.stringify(settings["crosshair.opacity"] ?? 1.0)};
        window.__mfSettings.textures     = ${JSON.stringify(!!settings["textures.enabled"])};
        window.__mfSettings.texturesPack = ${JSON.stringify(settings["textures.pack"] ?? {})};
        window.__mfSettings.keystrokes          = ${JSON.stringify(!!settings["keystrokes.enabled"])};
        window.__mfSettings.keystrokesShowCPS   = ${JSON.stringify(!!settings["keystrokes.showCPS"])};
        window.__mfSettings.keystrokesShadow    = ${JSON.stringify(!!settings["keystrokes.shadow"])};
        window.__mfSettings.keystrokesBorder    = ${JSON.stringify(!!settings["keystrokes.border"])};
        window.__mfSettings.keystrokesBorderWidth = ${JSON.stringify(settings["keystrokes.borderWidth"] ?? 1)};
        window.__mfSettings.keystrokesBorderColor = ${JSON.stringify(settings["keystrokes.borderColor"] ?? "#ffffff")};
        window.__mfSettings.keystrokesScale     = ${JSON.stringify(settings["keystrokes.scale"] ?? 1.0)};
        window.__mfSettings.keystrokesX         = ${JSON.stringify(settings["keystrokes.x"] ?? 20)};
        window.__mfSettings.keystrokesY         = ${JSON.stringify(settings["keystrokes.y"] ?? 40)};
        window.__mfSettings.keystrokesBg        = ${JSON.stringify(settings["keystrokes.bgColor"] ?? "#00000088")};
        window.__mfSettings.keystrokesBgPress   = ${JSON.stringify(settings["keystrokes.bgPressColor"] ?? "#ffffff")};
        window.__mfSettings.keystrokesText      = ${JSON.stringify(settings["keystrokes.textColor"] ?? "#ffffff")};
        window.__mfSettings.keystrokesTextPress = ${JSON.stringify(settings["keystrokes.textPressColor"] ?? "#000000")};
    `);

    const css = fs.readFileSync(path.join(__dirname, "menu/menu.css"), "utf8");
    await wc.executeJavaScript(`
        (function(){
            var el = document.getElementById("__matrix_style");
            if (el) el.remove();
            var s = document.createElement("style");
            s.id = "__matrix_style";
            s.textContent = ${JSON.stringify(css)};
            document.head.appendChild(s);
        })();
    `);

    const html = fs.readFileSync(path.join(__dirname, "menu/menu.html"), "utf8");
    await wc.executeJavaScript(`
        (function(){
            var el = document.getElementById("__matrix_root");
            if (el) el.remove();
            var wrap = document.createElement("div");
            wrap.id = "__matrix_root";
            wrap.innerHTML = ${JSON.stringify(html)};
            document.body.appendChild(wrap);
        })();
    `);

    const js = fs.readFileSync(path.join(__dirname, "menu/menu.js"), "utf8");
    const lobbyJs = fs.readFileSync(path.join(__dirname, "utils/lobby.js"), "utf8");
    const badgesJs = fs.readFileSync(path.join(__dirname, "utils/badges.js"), "utf8");
    await wc.executeJavaScript(js);
    await wc.executeJavaScript(lobbyJs);
    await wc.executeJavaScript(badgesJs);

    console.log("[Matrix Client] Injected");
}

const AD_DOMAINS = [
    "doubleclick.net", "googlesyndication.com", "googletagmanager.com",
    "googletagservices.com", "poki-cdn.com", "poki.io", "poki.com",
    "amazon-adsystem.com", "imasdk.googleapis.com",
    "securepubads.g.doubleclick.net", "pagead2.googlesyndication.com",
    "adservice.google.com", "apstag.js", "ima3.js", "prebid",
];

function isAdURL(url) {
    if (url.includes("googletagmanager.com/gtag")) return false;
    return AD_DOMAINS.some(d => url.includes(d));
}

ipcMain.handle("get-settings", () => loadSettings());

ipcMain.handle("set-setting", (e, key, value) => {
    const settings = loadSettings();
    settings[key] = value;
    saveSettings(settings);

    if (gameWin && !gameWin.isDestroyed()) {
        gameWin.webContents.send("setting-changed", key, value);
    }
    return true;
});

ipcMain.handle("switch-site", (e, sandbox) => {
    const settings = loadSettings();
    settings["client.sandbox"] = sandbox;
    saveSettings(settings);
    const url = sandbox ? "https://sandbox.minefun.io" : "https://minefun.io";
    if (gameWin && !gameWin.isDestroyed()) gameWin.loadURL(url);
    return true;
});

ipcMain.handle("get-current-url", async () => {
    if (!gameWin || gameWin.isDestroyed()) return "";
    try {
        return await gameWin.webContents.executeJavaScript("location.href");
    } catch (e) {
        return "";
    }
});

app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    initRPC();
    createSplash();

    splashWin.webContents.on("did-finish-load", async () => {
        splashStatus("Starting…");
        splashProgress(5);
        await checkForUpdates();
        splashStatus("Launching…");
        splashProgress(100);
        setTimeout(createGame, 400);
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});
