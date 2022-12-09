import { Item } from '../../src/domain/item.js'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { EntityVersion } from '../../src/es/entity-version.js'
import { PublishedEvent } from '../../src/es/published-event.js'

export const reconstituteStory = (id: string) =>
  Item.reconstitute(id, EntityVersion.new, [
    new PublishedEvent(ItemEvent.Created, { type: ItemType.Story }),
  ])

export const reconstituteStoryWithChildren = (childIds: string[], id: string) =>
  Item.reconstitute(id, EntityVersion.new, [
    new PublishedEvent(ItemEvent.Created, { type: ItemType.Story }),
    new PublishedEvent(ItemEvent.ChildrenAdded, { children: childIds }),
  ])

export const reconstituteTask = (id: string) =>
  Item.reconstitute(id, EntityVersion.new, [])

export const reconstituteTaskWithParent = (parentId: string, id: string) =>
  Item.reconstitute(id, EntityVersion.new, [
    new PublishedEvent(ItemEvent.ParentChanged, { parent: parentId }),
  ])

export const reconstituteFeature = (id: string) =>
  Item.reconstitute(id, EntityVersion.new, [
    new PublishedEvent(ItemEvent.Created, { type: ItemType.Feature }),
  ])

export const reconstitute = {
  feature: reconstituteFeature,
  story: reconstituteStory,
  storyWithChildren: reconstituteStoryWithChildren,
  task: reconstituteTask,
  taskWithParent: reconstituteTaskWithParent,
}
