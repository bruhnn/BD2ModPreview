const { contextBridge, ipcRenderer, webUtils } = require("electron")

contextBridge.exposeInMainWorld("electron", {
  invoke: (command, args) => ipcRenderer.invoke(command, args),
  getPathForFile: file => webUtils.getPathForFile(file),
  onAssetDownload: handler => {
    const listener = (_event, payload) => handler(payload)
    ipcRenderer.on("asset-download", listener)
    return () => ipcRenderer.removeListener("asset-download", listener)
  },
})
