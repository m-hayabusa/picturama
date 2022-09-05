import { ipcRenderer } from "electron";
import { Photo } from 'common/CommonTypes';

export function startDrag(photo: Photo) {
    document.body.style.cursor="wait"
    ipcRenderer.send('ondragstart', photo)
}

export function endDrag() {
    document.body.style.cursor="unset"
}
