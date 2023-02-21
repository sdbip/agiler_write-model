import { Feature } from '../../src/domain/feature.js'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { Task } from '../../src/domain/task.js'
import * as source from '../../src/es/source.js'

export const reconstituteStory = (id: string) =>
  Task.reconstitute(id, source.EntityVersion.new, [
    new  source.PublishedEvent(ItemEvent.Created, { type: ItemType.Story }),
  ])

export const reconstituteStoryWithChildren = (childIds: string[], id: string) =>
  Task.reconstitute(id, source.EntityVersion.new, [
    new  source.PublishedEvent(ItemEvent.Created, { type: ItemType.Story }),
    new  source.PublishedEvent(ItemEvent.ChildrenAdded, { children: childIds }),
  ])

export const reconstituteTask = (id: string) =>
  Task.reconstitute(id, source.EntityVersion.new, [])

export const reconstituteTaskWithParent = (parentId: string, id: string) =>
  Task.reconstitute(id, source.EntityVersion.new, [
    new  source.PublishedEvent(ItemEvent.ParentChanged, { parent: parentId }),
  ])

export const reconstituteFeature = (id: string) =>
  Feature.reconstitute(id, source.EntityVersion.new, [
    new  source.PublishedEvent(ItemEvent.Created, { type: ItemType.Feature }),
  ])

export const reconstitute = {
  feature: reconstituteFeature,
  story: reconstituteStory,
  storyWithChildren: reconstituteStoryWithChildren,
  task: reconstituteTask,
  taskWithParent: reconstituteTaskWithParent,
}
