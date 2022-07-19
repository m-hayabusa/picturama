import os from 'os'
import { ipcRenderer } from "electron";

export function startDrag (filePath: string, thumbnailPath: string) {
    if (!thumbnailPath.match(/\.(?:png|jpg|jpeg)$/)) thumbnailPath = filePath
    if (os.platform() === 'win32') {
        filePath = filePath.replace(/\//g, '\\')
        thumbnailPath = thumbnailPath.replace(/\//g, '\\')
    } else {
        filePath = filePath.replace(/\\/g, '/')
        thumbnailPath = thumbnailPath.replace(/\\/g, '/')
    }
    console.log("Lib",filePath, thumbnailPath)
    return ipcRenderer.send('ondragstart', filePath, thumbnailPath)
}
