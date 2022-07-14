import DB from 'sqlite3-helper/no-generators'

import { PhotoId, Tag, TagId } from 'common/CommonTypes'
import { slug } from 'common/util/LangUtil'
import SerialJobQueue from 'common/util/SerialJobQueue'

import { toSqlStringCsv } from 'background/util/DbUtil'


type StorePhotoTagsJob = { photoId: PhotoId, photoTags: string[] }

const storePhotoTagsQueue = new SerialJobQueue(
    (newJob, existingJob) => (newJob.photoId === existingJob.photoId) ? newJob : null,
    processNextStorePhotoTags)

let tagsHaveChanged = false
let tagsHaveBeenDeleted = false


export async function fetchTags(): Promise<Tag[]> {
    if (tagsHaveBeenDeleted) {
        tagsHaveBeenDeleted = false
        await DB().run('delete from tags where id not in (select tag_id from photos_tags group by tag_id)')
    }

    tagsHaveChanged = false
    return DB().query<Tag>('select * from tags order by slug').then((val) => (
        val.map(tag => {
            tag.title = decodeURIComponent(tag.title)
            return tag
        }))
    )
}


/**
 * Stores the tags of a photo
 *
 * @return Whether `fetchTags` should be called (the global list of tags should be reloaded).
 */
export function storePhotoTags(photoId: PhotoId, photoTags: string[]): Promise<boolean> {
    photoTags = photoTags.map(e => encodeURIComponent(e))
    return storePhotoTagsQueue.addJob({ photoId, photoTags })
}


async function processNextStorePhotoTags(job: StorePhotoTagsJob): Promise<boolean> {
    const { photoId, photoTags } = job
    const photoTagsSlugged = photoTags.map(tag => slug(tag))

    await DB().query('BEGIN')
    try {
        const existingTags = await DB().query<{ id: number, slug: string }>(`select id, slug from tags where slug in (${toSqlStringCsv(photoTagsSlugged)})`)
        const tagIdBySlug = {}
        for (const tagInfo of existingTags) {
            tagIdBySlug[tagInfo.slug] = tagInfo.id
        }

        const photoTagMappings: { photo_id: PhotoId, tag_id: TagId }[] = []
        for (let tagIndex = 0, tagCount = photoTags.length; tagIndex < tagCount; tagIndex++) {
            const tagSlugged = photoTagsSlugged[tagIndex]
            let tagId = tagIdBySlug[tagSlugged]
            if (!tagId) {
                tagId = await DB().insert('tags', {
                    title: photoTags[tagIndex],
                    slug: tagSlugged,
                    created_at: Date.now()
                })
                tagsHaveChanged = true
            }
            photoTagMappings.push({ photo_id: photoId, tag_id: tagId })
        }

        const deletedCount = (await DB().run('delete from photos_tags where photo_id = ?', photoId)).changes
        if (deletedCount != 0) {
            tagsHaveChanged = true
            tagsHaveBeenDeleted = true
        }
        if (photoTagMappings.length > 0) {
            await DB().insert('photos_tags', photoTagMappings)
        }

        await DB().query('END')
    } catch (error) {
        console.error('Setting tags for photo failed', error)
        await DB().query('ROLLBACK')
        throw error
    }

    return tagsHaveChanged && storePhotoTagsQueue.getQueueLength() === 0
}


/**
 * Deletes all tags of a set of photos
 *
 * @return Whether `fetchTags` should be called (the global list of tags should be reloaded).
 */
export async function deleteTagsOfPhotos(photoIds: PhotoId[]): Promise<boolean> {
    if (!photoIds.length) {
        return false
    }

    const deletedCount = (await DB().run(`delete from photos_tags where photo_id in (${photoIds.join(',')})`)).changes
    if (deletedCount != 0) {
        tagsHaveChanged = true
        tagsHaveBeenDeleted = true
    }
    return tagsHaveChanged
}
