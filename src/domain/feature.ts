import { randomUUID } from 'crypto'
import { guard } from '../guard-clauses.js'
import * as source from '../es/source.js'
import { ItemEvent, ItemType, Progress } from './enums.js'

type AddEvent =
  ((this: Feature, event: ItemEvent.Created, details: { title: string, type: ItemType }) => void)
& ((this: Feature, event: ItemEvent.TypeChanged, details: {type: ItemType}) => void)
& ((this: Feature, event: ItemEvent.ChildrenAdded, details: { children: [ string ] }) => void)
& ((this: Feature, event: ItemEvent.ChildrenRemoved, details: { children: [ string ] }) => void)
& ((this: Feature, event: ItemEvent.ParentChanged, details: { parent: string|null }) => void)
& ((this: Feature, event: ItemEvent.ProgressChanged, details: { progress: Progress }) => void)

export class Feature extends source.Entity {
  static readonly TYPE_CODE = 'Feature'

  private itemType = ItemType.Feature
  private parent?: string

  add(child: Feature) {
    guard.that(this.itemType !== ItemType.Task, 'Tasks may not have children')
    guard.that(child.parent === undefined, 'Feature must not have other parent')

    this.addNewEvent(ItemEvent.ChildrenAdded, { children: [ child.id.id ] })
    if (this.itemType === ItemType.Feature)
      this.addNewEvent(ItemEvent.TypeChanged, { type: ItemType.Epic })

    child.removeEventMatching(e => e.name === ItemEvent.ParentChanged)
    child.addNewEvent(ItemEvent.ParentChanged, { parent: this.id.id })
  }

  remove(child: Feature) {
    if (child.parent !== this.id.id) return
    child.parent = undefined
    this.addNewEvent(ItemEvent.ChildrenRemoved, { children: [ child.id.id ] })
    child.addNewEvent(ItemEvent.ParentChanged, { parent: null })
  }

  static new(title: string, type?: ItemType): Feature {
    const feature = new Feature(randomUUID(), source.EntityVersion.new)
    feature.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Feature })
    return feature
  }

  static reconstitute(id: string, version: source.EntityVersion, events: source.PublishedEvent[]) {
    const feature = new Feature(id, version)
    for (const event of events) {
      switch (event.name) {
        case ItemEvent.Created:
        case ItemEvent.TypeChanged:
          feature.itemType = event.details.type
          break
        case ItemEvent.ParentChanged:
          feature.parent = event.details.parent
          break
        default: break
      }
    }
    return feature
  }

  private constructor(id: string, version: source.EntityVersion) { super(new source.CanonicalEntityId(id, Feature.TYPE_CODE), version) }

  private removeEventMatching(predicate: (e: source.UnpublishedEvent) => boolean) {
    const existingEvent = this.unpublishedEvents.findIndex(predicate)
    if (existingEvent < 0) return
    this.unpublishedEvents.splice(existingEvent, 1)
  }

  private addNewEvent: AddEvent = (event, details) => {
    this.unpublishedEvents.push(new source.UnpublishedEvent(event, details))
  }
}
