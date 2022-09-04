// import piexif from 'piexifjs'
import Sharp from "sharp"
import { execFile } from 'child_process';

import { getMasterPath } from 'common/util/DataUtil'
import { Size } from 'common/util/GeometryTypes'
import { parsePath } from 'common/util/TextUtil'
import { Photo, PhotoExportOptions } from 'common/CommonTypes'

import { fetchPhotoWorkOfPhoto } from 'background/store/PhotoWorkStore'
import { fsExists, fsStat, fsUtimes } from 'background/util/FileUtil'


const jpgExtensionRE = new RegExp(`\\.jpe?g$`, 'i')


export async function exportPhoto(photo: Photo, photoIndex: number, options: PhotoExportOptions, overwrite = false): Promise<void> {
    const masterPath = getMasterPath(photo);

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

    Sharp.cache(false)
    let image = Sharp(masterPath)

    if (photoWork.rotationTurns)
        image = image.rotate(photoWork.rotationTurns * 90)

    if (photoWork.cropRect) {
        let size: Sharp.Region = {
            left: 0,
            top: 0,
            width: 0,
            height: 0
        };

        let width:number, height:number

        if (photoWork.rotationTurns === 1 || photoWork.rotationTurns === 3) {
            width = photo.master_height
            height = photo.master_width
        } else {
            width = photo.master_width
            height = photo.master_height
        }

        size.left = width / 2 + photoWork.cropRect.x
        size.top = height / 2 + photoWork.cropRect.y
        size.width = photoWork.cropRect.width
        size.height = photoWork.cropRect.height

        size.left = Math.round(size.left)
        size.top = Math.round(size.top)
        size.width = Math.round(size.width)
        size.height = Math.round(size.height)

        image = image.extract(size)
    }

    if (maxSize) {
        image = image.resize(maxSize.width, maxSize.height)
    }

    await image.toFormat(options.format).toFile(exportFilePath)

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
