import { execFile } from 'child_process';

import { getMasterPath } from 'common/util/DataUtil'
import { Size } from 'common/util/GeometryTypes'
import { parsePath } from 'common/util/TextUtil'
import { Photo, PhotoExportOptions } from 'common/CommonTypes'

import { fetchPhotoWorkOfPhoto } from 'background/store/PhotoWorkStore'
import { fsExists, fsWriteFile, fsStat, fsUtimes } from 'background/util/FileUtil'
import ForegroundClient from 'background/ForegroundClient'


export async function exportPhoto(photo: Photo, photoIndex: number, options: PhotoExportOptions, overwrite = false): Promise<void> {
    const masterPath = getMasterPath(photo)

    let maxSize: Size | null
    switch (options.size) {
        case 'S':
            maxSize = reduceSize(photo, 6000)
            break
        case 'M':
            maxSize = reduceSize(photo, 200000)
            break
        case 'L':
            maxSize = reduceSize(photo, 1000000)
            break
        case 'original':
            maxSize = null
            break
        case 'custom':
            switch (options.customSizeSide) {
                case 'size':
                    maxSize = { width: options.customSizePixels, height: options.customSizePixels }
                    break
                case 'width':
                    maxSize = { width: options.customSizePixels, height: 100 * options.customSizePixels }
                    break
                case 'height':
                    maxSize = { width: 100 * options.customSizePixels, height: options.customSizePixels }
                    break
                default:
                    throw new Error('Unsupported customSizeSide: ' + options.customSizeSide)
            }
            break
        default:
            throw new Error('Unsupported size type: ' + options.size)
    }

    const photoWork = await fetchPhotoWorkOfPhoto(photo)
    let imageBinaryString = await ForegroundClient.renderPhoto(photo, photoWork, maxSize, options)

    let exportFileBasePath: string
    switch (options.fileNameStyle) {
        case 'like-original': {
            const filenameParts = parsePath(photo.master_filename)
            exportFileBasePath = `${options.folderPath}/${filenameParts.name}`
            break
        }
        case 'sequence':
            exportFileBasePath = `${options.folderPath}/${options.fileNamePrefix}${photoIndex + 1}`
            break
        default:
            throw new Error('Unsupported fileNameStyle: ' + options.fileNameStyle)
    }

    let exportFilePath: string
    let counter = 0
    do {
        const suffix = counter === 0 ? '' : ('_' + (counter < 10 ? '00' : counter < 100 ? '0' : '') + counter)
        exportFilePath = `${exportFileBasePath}${suffix}.${options.format}`
        counter++
    } while (!overwrite && await fsExists(exportFilePath))

    await fsWriteFile(exportFilePath, imageBinaryString, 'binary')

    if (options.withMetadata) {
        try{
            await execFile(process.platform == "win32" ? "./node_modules/exiftool.exe/vendor/exiftool.exe" : "exiftool", [
                "-charset", "utf8",
                "-overwrite_original",
                "-tagsFromFile", masterPath,
                exportFilePath
            ]).stdout?.on("data", (data: string) => {
                console.log(data);
            });
        }catch(e){
            console.warn(e);
        }
    }

    const masterStat = await fsStat(masterPath)
    await fsUtimes(exportFilePath, masterStat.atime, masterStat.mtime)

    console.log('Exported ' + exportFilePath)
}


function reduceSize(photo: Photo, pixelCount: number): Size {
    const photoWidth = photo.edited_width || photo.master_width
    const photoHeight = photo.edited_height || photo.master_height

    const aspect = photoWidth / photoHeight
    const width = Math.min(photoWidth, Math.round(Math.sqrt(pixelCount * aspect)))
    return {
        width,
        height: width / aspect
    }
}
