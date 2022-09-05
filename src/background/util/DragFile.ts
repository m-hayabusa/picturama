import config from 'common/config'
import Sharp from "sharp"
import { Photo, PhotoExportOptions } from 'common/CommonTypes'
import { exportPhoto } from 'background/ExportController'
import os from 'os'
import ForegroundClient from 'background/ForegroundClient'


export function dragFile(event: Electron.IpcMainEvent, photo: Photo) {
    const exportOptions: PhotoExportOptions = {
        format: 'png',
        quality: 0.9,
        size: 'original',
        customSizeSide: 'size',
        customSizePixels: 1024,
        withMetadata: true,
        fileNameStyle: 'like-original',
        fileNamePrefix: 'Photo_',
        folderPath: config.tmp
    }

    let filePath = `${config.tmp}/${photo.master_filename.replace(/([^.]+)$/, exportOptions.format)}`
    let iconPath = `${config.tmp}/drag-thumb.png`

    if (os.platform() === 'win32') {
        filePath = filePath.replace(/\//g, '\\')
        iconPath = iconPath.replace(/\//g, '\\')
    } else {
        filePath = filePath.replace(/\\/g, '/')
        iconPath = iconPath.replace(/\\/g, '/')
    }
    exportPhoto(photo, 1, exportOptions, true).then(()=>{
        Sharp(filePath)
            .resize({ height: 128, width: 128, fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
            .png().toFile(iconPath)
            .then(()=>{
                ForegroundClient.exportDone();
                event.sender.startDrag({
                    file: filePath,
                    icon: iconPath
                })
            })
    })
}
