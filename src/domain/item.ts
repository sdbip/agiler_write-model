import { randomUUID } from 'crypto'
import { CanonicalEntityId } from '../es/canonical-entity-id.js'
import { EntityVersion } from '../es/entity-version.js'
import { failFast } from '../es/fail-fast.js'
import { PublishedEvent } from '../es/published-event.js'
import { UnpublishedEvent } from '../es/unpublished-event.js'
import { ItemEvent, ItemType, Progress } from './enums.js'

type AddEvent =
  ((this: Item, event: ItemEvent.Created, details: { title: string, type: ItemType }) => void)
& ((this: Item, event: ItemEvent.TypeChanged, details: {type: ItemType}) => void)
& ((this: Item, event: ItemEvent.ChildrenAdded, details: { children: [ string ] }) => void)
& ((this: Item, event: ItemEvent.ChildrenRemoved, details: { children: [ string ] }) => void)
& ((this: Item, event: ItemEvent.ParentChanged, details: { parent: string|null }) => void)
& ((this: Item, event: ItemEvent.ProgressChanged, details: { progress: Progress }) => void)

abstract class Entity {
  readonly unpublishedEvents: UnpublishedEvent[] = []

  constructor(readonly id: CanonicalEntityId, readonly version: EntityVersion) {
    failFast.unlessInstanceOf(CanonicalEntityId)(id, 'id')
    failFast.unlessInstanceOf(EntityVersion)(version, 'version')
  }
}

export class Item extends Entity {
  static readonly TYPE_CODE = 'Item'

  private itemType = ItemType.Task
  private parent?: string

  promote() {
    failFast.unless(this.itemType === ItemType.Task, `Only ${ItemType.Task} items may be promoted`)

    this.itemType = ItemType.Story
    this.addNewEvent(ItemEvent.TypeChanged, { type: ItemType.Story })
  }

  add(item: Item) {
    failFast.unless(this.itemType !== ItemType.Task, `${ItemType.Task} items may not have children`)
    failFast.unless(item.parent === undefined, 'Item must not have other parent')
    if (this.itemType === ItemType.Story)
      failFast.unless(item.itemType === ItemType.Task, `Only ${ItemType.Task} items may be added`)

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
    failFast.unless(this.itemType === ItemType.Task, `Only ${ItemType.Task} items may be completed`)

    this.addNewEvent(ItemEvent.ProgressChanged, { progress: Progress.Completed })
  }

  static new(title: string, type?: ItemType): Item {
    const item = new Item(randomUUID(), EntityVersion.new)
    item.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Task })
    return item
  }

  static reconstitute(id: string, version: EntityVersion, events: PublishedEvent[]) {
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

  private constructor(id: string, version: EntityVersion) { super(new CanonicalEntityId(id, Item.TYPE_CODE), version) }

  private removeEventMatching(predicate: (e: UnpublishedEvent) => boolean) {
    const existingEvent = this.unpublishedEvents.findIndex(predicate)
    if (existingEvent < 0) return
    this.unpublishedEvents.splice(existingEvent, 1)
  }

  private addNewEvent: AddEvent = (event, details) => {
    this.unpublishedEvents.push(new UnpublishedEvent(event, details))
  }
}
