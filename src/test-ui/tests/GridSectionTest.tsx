import React from 'react'

import CancelablePromise from 'common/util/CancelablePromise'
import { LoadedPhotoSection, Photo, PhotoSectionId } from 'common/CommonTypes'
import { getMasterPath, getNonRawPath, getThumbnailPath } from 'common/util/DataUtil'
import { fileUrlFromPath } from 'common/util/TextUtil'

import { defaultGridRowHeight } from 'app/UiConstants'
import { GridSectionLayout } from 'app/UITypes'
import { estimateSectionLayout, createDummyLayoutBoxes, createLayoutForLoadedSection } from 'app/controller/LibraryController'
import { gridBg } from 'app/style/variables'
import GridSection, { Props, sectionHeadHeight } from 'app/ui/library/GridSection'

import { addSection, action } from 'test-ui/core/UiTester'
import { createTestPhotoId, mockLibrarySelectionController, testBigPhoto, testPanoramaPhoto, testPortraitPhoto } from 'test-ui/util/MockData'
import { createSection, createRandomDummyPhoto } from 'test-ui/util/TestUtil'


const containerWidth = 800
const scrollBarWidth = 20
const viewportWidth = containerWidth - scrollBarWidth

const defaultSectionId: PhotoSectionId = '2018-08-15'
const defaultPhotos = [ testBigPhoto, testPortraitPhoto, testPanoramaPhoto ]
const defaultSection = createSection(defaultSectionId, defaultPhotos)
const defaultLayout = createLayoutForSection(defaultSection, viewportWidth, defaultGridRowHeight)


const defaultProps: Props = {
    inSelectionMode: false,
    section: defaultSection,
    layout: defaultLayout,
    activePhotoId: null,
    sectionSelection: undefined,
    librarySelectionController: mockLibrarySelectionController,
    getThumbnailSrc: (photo: Photo) => fileUrlFromPath(getNonRawPath(photo)),
    getMasterPath: (photo: Photo) => getMasterPath(photo),
    getThumbnailPath: (photoId: number) => getThumbnailPath(photoId),
    startDrag: (fileName: string, thumbnailPath: string) => ()=>{},
    createThumbnail: (sectionId: PhotoSectionId, photo: Photo) => {
        if (photo.master_filename === 'dummy') {
            return new CancelablePromise<string>(() => {})
        } else {
            return new CancelablePromise<string>(Promise.resolve(fileUrlFromPath(getNonRawPath(photo))))
        }
    },
    showPhotoDetails: action('showPhotoDetails'),
}


addSection('GridSection')
    .setArenaStyle({ width: containerWidth, padding: 0, backgroundColor: gridBg, overflowY: 'auto' })
    .add('normal', context => (
        <GridSection
            {...defaultProps}
        />
    ))
    .add('selection mode', context => (
        <GridSection
            {...defaultProps}
            inSelectionMode={true}
            sectionSelection={{
                sectionId: defaultSection.id,
                selectedCount: 1,
                selectedPhotosById: { [testPortraitPhoto.id]: true }
            }}
        />
    ))
    .add('selection mode (all)', context => (
        <GridSection
            {...defaultProps}
            inSelectionMode={true}
            sectionSelection={{
                sectionId: defaultSection.id,
                selectedCount: 2,
                selectedPhotosById: 'all'
            }}
        />
    ))
    .add('creating thumbnails', context => {
        let photos = [ ...defaultPhotos ]
        for (let i = 0; i < 20; i++) {
            photos.push(createRandomDummyPhoto())
        }
        photos[0] = { ...photos[0], id: createTestPhotoId(), master_filename: 'dummy' }
        const section = createSection(defaultSectionId, photos)
        const layout = createLayoutForSection(section, viewportWidth, defaultGridRowHeight)

        return (
            <GridSection
                {...defaultProps}
                section={section}
                layout={layout}
            />
        )
    })
    .add('loading section data', context => {
        const photoCount = 14
        const layout = estimateSectionLayout(photoCount, viewportWidth, defaultGridRowHeight)
        const sectionBodyHeight = layout.height - sectionHeadHeight
        return (
            <GridSection
                {...defaultProps}
                section={{
                    id: defaultSectionId,
                    title: defaultSectionId,
                    count: 14
                }}
                layout={{
                    ...layout,
                    fromBoxIndex: 0,
                    toBoxIndex: photoCount,
                    boxes: createDummyLayoutBoxes(layout.width, sectionBodyHeight, defaultGridRowHeight, photoCount)
                }}
            />
        )
    })



function createLayoutForSection(section: LoadedPhotoSection, viewportWidth: number, gridRowHeight: number):
    GridSectionLayout
{
    const layout = createLayoutForLoadedSection(section, viewportWidth, gridRowHeight)
    layout.fromBoxIndex = 0
    layout.toBoxIndex = section.count
    return layout
}
