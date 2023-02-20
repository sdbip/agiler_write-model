import { randomUUID } from 'crypto'
import { guard } from '../guard-clauses.js'
import * as source from '../es/source.js'
import { ItemEvent, ItemType, Progress } from './enums.js'

type AddEvent =
  ((this: Item, event: ItemEvent.Created, details: { title: string, type: ItemType }) => void)
& ((this: Item, event: ItemEvent.TypeChanged, details: {type: ItemType}) => void)
& ((this: Item, event: ItemEvent.ChildrenAdded, details: { children: [ string ] }) => void)
& ((this: Item, event: ItemEvent.ChildrenRemoved, details: { children: [ string ] }) => void)
& ((this: Item, event: ItemEvent.ParentChanged, details: { parent: string|null }) => void)
& ((this: Item, event: ItemEvent.ProgressChanged, details: { progress: Progress }) => void)

export class Item extends source.Entity {
  static readonly TYPE_CODE = 'Item'

  private itemType = ItemType.Task
  private parent?: string

  promote() {
    guard.that(this.itemType === ItemType.Task, `Only ${ItemType.Task} items may be promoted`)

    this.itemType = ItemType.Story
    this.addNewEvent(ItemEvent.TypeChanged, { type: ItemType.Story })
  }

  add(item: Item) {
    guard.that(this.itemType !== ItemType.Task, `${ItemType.Task} items may not have children`)
    guard.that(item.parent === undefined, 'Item must not have other parent')
    if (this.itemType === ItemType.Story)
      guard.that(item.itemType === ItemType.Task, `Only ${ItemType.Task} items may be added`)

    this.addNewEvent(ItemEvent.ChildrenAdded, { children: [ item.id.id ] })
    if (this.itemType === ItemType.Feature)
      this.addNewEvent(ItemEvent.TypeChanged, { type: ItemType.Epic })

    item.removeEventMatching(e => e.name === ItemEvent.ParentChanged)
    item.addNewEvent(ItemEvent.ParentChanged, { parent: this.id.id })
  }

  remove(task: Item) {
    if (task.parent !== this.id.id) return
    task.parent = undefined
    this.addNewEvent(ItemEvent.ChildrenRemoved, { children: [ task.id.id ] })
    task.addNewEvent(ItemEvent.ParentChanged, { parent: null })
  }

  complete() {
    guard.that(this.itemType === ItemType.Task, `Only ${ItemType.Task} items may be completed`)

    this.addNewEvent(ItemEvent.ProgressChanged, { progress: Progress.Completed })
  }

  static new(title: string, type?: ItemType): Item {
    const item = new Item(randomUUID(), source.EntityVersion.new)
    item.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Task })
    return item
  }

  static reconstitute(id: string, version: source.EntityVersion, events: source.PublishedEvent[]) {
    const item = new Item(id, version)
    for (const event of events) {
      switch (event.name) {
        case ItemEvent.Created:
        case ItemEvent.TypeChanged:
          item.itemType = event.details.type
          break
        case ItemEvent.ParentChanged:
          item.parent = event.details.parent
          break
        default: break
      }
    }
    return item
  }

  private constructor(id: string, version: source.EntityVersion) { super(new source.CanonicalEntityId(id, Item.TYPE_CODE), version) }

  private removeEventMatching(predicate: (e: source.UnpublishedEvent) => boolean) {
    const existingEvent = this.unpublishedEvents.findIndex(predicate)
    if (existingEvent < 0) return
    this.unpublishedEvents.splice(existingEvent, 1)
  }

  private addNewEvent: AddEvent = (event, details) => {
    this.unpublishedEvents.push(new source.UnpublishedEvent(event, details))
  }
}
