const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  isElectron: true,
  openExternal: (url) => ipcRenderer.invoke("desktop:open-external", url),
  beginOAuth: () => ipcRenderer.invoke("auth:begin-oauth"),
  awaitOAuthCallback: () => ipcRenderer.invoke("auth:await-oauth-callback"),
});
