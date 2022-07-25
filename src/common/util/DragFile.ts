import { ipcRenderer } from "electron";
import { Photo } from 'common/CommonTypes';

export function startDrag(photo: Photo) {
    ipcRenderer.send('ondragstart', photo)
}
