const { contextBridge, ipcRenderer, webUtils } = require("electron")

contextBridge.exposeInMainWorld("electron", {
  invoke: (command, args) => ipcRenderer.invoke(command, args),
  getPathForFile: file => webUtils.getPathForFile(file),
})
