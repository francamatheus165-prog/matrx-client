(function () {
  "use strict";

  const { ipcRenderer } = require("electron");

  window.electronAPI = {
    getSettings: () => ipcRenderer.invoke("get-settings"),
    setSetting: (key, val) => ipcRenderer.invoke("set-setting", key, val),
    onSettingChanged: (cb) =>
      ipcRenderer.on("setting-changed", (_, k, v) => cb(k, v)),
    switchSite: (sandbox) => ipcRenderer.invoke("switch-site", sandbox),
    getCurrentURL: () => ipcRenderer.invoke("get-current-url"),
  };

  window.__mfSettings = {
    zoom: false,
    zoomLevel: 0.35,
    zoomHeld: false,
    zoomKeybind: "KeyV",
    adblocker: false,
    crosshair: false,
    crosshairURL: "",
    crosshairSize: 32,
    crosshairOpacity: 1.0,
    textures: false,
    texturesPack: {},
    keystrokes: false,
    keystrokesShowCPS: true,
    keystrokesShadow: true,
    keystrokesBorder: false,
    keystrokesBorderWidth: 1,
    keystrokesBorderColor: "#ffffff",
    keystrokesScale: 1.0,
    keystrokesX: 20,
    keystrokesY: 40,
    keystrokesBg: "#00000088",
    keystrokesBgPress: "#ffffff",
    keystrokesText: "#ffffff",
    keystrokesTextPress: "#000000",
  };

  ipcRenderer.on("setting-changed", (_, key, value) => {
    if (key === "zoom.enabled") window.__mfSettings.zoom = !!value;
    if (key === "zoom.level") window.__mfSettings.zoomLevel = value;
    if (key === "zoom.keybind") window.__mfSettings.zoomKeybind = value;
    if (key === "adblocker.enabled") window.__mfSettings.adblocker = !!value;
    if (key === "crosshair.enabled") window.__mfSettings.crosshair = !!value;
    if (key === "crosshair.url") window.__mfSettings.crosshairURL = value;
    if (key === "crosshair.size") window.__mfSettings.crosshairSize = value;
    if (key === "crosshair.opacity") window.__mfSettings.crosshairOpacity = value;
    if (key === "textures.enabled") window.__mfSettings.textures = !!value;
    if (key === "textures.pack") window.__mfSettings.texturesPack = value;
    if (key === "keystrokes.enabled") window.__mfSettings.keystrokes = !!value;
    if (key === "keystrokes.showCPS") window.__mfSettings.keystrokesShowCPS = !!value;
    if (key === "keystrokes.shadow") window.__mfSettings.keystrokesShadow = !!value;
    if (key === "keystrokes.border") window.__mfSettings.keystrokesBorder = !!value;
    if (key === "keystrokes.borderWidth") window.__mfSettings.keystrokesBorderWidth = value;
    if (key === "keystrokes.borderColor") window.__mfSettings.keystrokesBorderColor = value;
    if (key === "keystrokes.scale") window.__mfSettings.keystrokesScale = value;
    if (key === "keystrokes.x") window.__mfSettings.keystrokesX = value;
    if (key === "keystrokes.y") window.__mfSettings.keystrokesY = value;
    if (key === "keystrokes.bgColor") window.__mfSettings.keystrokesBg = value;
    if (key === "keystrokes.bgPressColor") window.__mfSettings.keystrokesBgPress = value;
    if (key === "keystrokes.textColor") window.__mfSettings.keystrokesText = value;
    if (key === "keystrokes.textPressColor") window.__mfSettings.keystrokesTextPress = value;
  });

  document.addEventListener("keydown", (e) => {
    if (e.code === window.__mfSettings.zoomKeybind)
      window.__mfSettings.zoomHeld = true;
  });
  document.addEventListener("keyup", (e) => {
    if (e.code === window.__mfSettings.zoomKeybind)
      window.__mfSettings.zoomHeld = false;
  });
})();
