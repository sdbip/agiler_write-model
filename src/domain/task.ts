import { randomUUID } from 'crypto'
import { guard } from '../guard-clauses.js'
import * as source from '../es/source.js'
import { ItemEvent, ItemType, Progress } from './enums.js'

type AddEvent =
  ((this: Task, event: ItemEvent.Created, details: { title: string, type: ItemType }) => void)
& ((this: Task, event: ItemEvent.ChildrenAdded, details: { children: [ string ] }) => void)
& ((this: Task, event: ItemEvent.ChildrenRemoved, details: { children: [ string ] }) => void)
& ((this: Task, event: ItemEvent.ParentChanged, details: { parent: string|null }) => void)
& ((this: Task, event: ItemEvent.ProgressChanged, details: { progress: Progress }) => void)

export class Task extends source.Entity {
  static readonly TYPE_CODE = 'Task'

  private itemType = ItemType.Task
  private parent?: string

  add(child: Task) {
    // if (child.parent == this.id.id) return
    guard.that(child.parent === undefined, 'Item must not have other parent')

    this.addNewEvent(ItemEvent.ChildrenAdded, { children: [ child.id.id ] })
    child.removeEventMatching(e => e.name === ItemEvent.ParentChanged)
    child.addNewEvent(ItemEvent.ParentChanged, { parent: this.id.id })
  }

  remove(child: Task) {
    if (child.parent !== this.id.id) return
    child.parent = undefined
    this.addNewEvent(ItemEvent.ChildrenRemoved, { children: [ child.id.id ] })
    child.addNewEvent(ItemEvent.ParentChanged, { parent: null })
  }

  finish() {
    // guard.isEmpty(this.children)

    this.addNewEvent(ItemEvent.ProgressChanged, { progress: Progress.Completed })
  }

  static new(title: string, type?: ItemType): Task {
    const item = new Task(randomUUID(), source.EntityVersion.new)
    item.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Task })
    return item
  }

  static reconstitute(id: string, version: source.EntityVersion, events: source.PublishedEvent[]) {
    const item = new Task(id, version)
    for (const event of events) {
      switch (event.name) {
        case ItemEvent.Created:
        case 'TypeChanged':
          guard.isIn([ ItemType.Story, ItemType.Task ])(event.details.type)
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

  private constructor(id: string, version: source.EntityVersion) { super(new source.CanonicalEntityId(id, Task.TYPE_CODE), version) }

  private removeEventMatching(predicate: (e: source.UnpublishedEvent) => boolean) {
    const existingEvent = this.unpublishedEvents.findIndex(predicate)
    if (existingEvent < 0) return
    this.unpublishedEvents.splice(existingEvent, 1)
  }

  private addNewEvent: AddEvent = (event, details) => {
    this.unpublishedEvents.push(new source.UnpublishedEvent(event, details))
  }
}
