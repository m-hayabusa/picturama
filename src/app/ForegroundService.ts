import { ipcRenderer } from 'electron'

import { Device } from 'common/CommonTypes'
import { assertRendererProcess } from 'common/util/ElectronUtil'
import { encodeIpcError } from 'common/util/IpcUtil'

import { showExternalError } from 'app/ErrorPresenter'
import ImportProgressController from 'app/controller/ImportProgressController'
import { setTags } from 'app/controller/PhotoTagController'
import { renderPhoto, renderImage } from 'app/renderer/PhotoRenderer'
import { setFullScreenAction, initDevicesAction, addDeviceAction, removeDeviceAction, emptyTrashAction, openSettingsAction } from 'app/state/actions'
import store from 'app/state/store'
import { endDrag } from 'common/util/DragFile'


assertRendererProcess()


export function init() {
    ipcRenderer.on('executeForegroundAction', (event, callId: number, action: string, params: any) => {
        executeForegroundAction(action, params)
            .then(result => {
                ipcRenderer.send('onForegroundActionDone', callId, null, result)
            },
            error => {
                ipcRenderer.send('onForegroundActionDone', callId, encodeIpcError(error), null)
            })
    })

    // TODO: Revive Legacy code of 'version' feature
    //ipcRenderer.on('new-version', (event, version: any /* Type should be `Version`, but it doesn't work */) => updatePhotoVersion(version))

    ipcRenderer.on('scanned-devices', (event, devices: Device[]) => store.dispatch(initDevicesAction(devices)))
    ipcRenderer.on('add-device', (event, device: Device) => store.dispatch(addDeviceAction(device)))
    ipcRenderer.on('remove-device', (event, device: Device) => store.dispatch(removeDeviceAction(device)))
}


async function executeForegroundAction(action: string, params: any): Promise<any> {
    if (action === 'showError') {
        showExternalError(params.processName, params.msg, params.errorStack)
    } else if (action === 'onFullScreenChange') {
        store.dispatch(setFullScreenAction(params.isFullScreen))
    } else if (action === 'showSettings') {
        store.dispatch(openSettingsAction())
    } else if (action === 'setImportProgress') {
        ImportProgressController.setImportProgress(params.progress, params.updatedTags)
    } else if (action === 'onPhotoTrashed') {
        store.dispatch(emptyTrashAction(params.photoIds))

        if (params.updatedTags) {
            setTags(params.updatedTags)
        }
    } else if (action === 'renderPhoto') {
        // We send the image as binary string (not as node Buffer), because all data is converted to JSON which doesn't support Buffers
        return renderPhoto(params.photo, params.photoWork, params.maxSize, params.options)
    } else if (action === 'renderImage') {
        // We send the image as binary string (not as node Buffer), because all data is converted to JSON which doesn't support Buffers
        return renderImage(params.imagePath, params.maxSize, params.options)
    } else if (action === 'exportDone'){
        return endDrag();
    } else {
        throw new Error('Unknown foreground action: ' + action)
    }
}
