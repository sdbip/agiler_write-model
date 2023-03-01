import { randomUUID } from 'crypto';
import { guard } from '../guard-clauses.js';
import * as source from '../es/source.js';
import { ItemEvent, ItemType } from './enums.js';
export class Feature extends source.Entity {
    add(child) {
        guard.that(this.itemType !== ItemType.Task, 'Tasks may not have children');
        guard.that(child.parent === undefined, 'Feature must not have other parent');
        this.addNewEvent(ItemEvent.ChildrenAdded, { children: [child.id.id] });
        child.removeEventMatching(e => e.name === ItemEvent.ParentChanged);
        child.addNewEvent(ItemEvent.ParentChanged, { parent: this.id.id });
    }
    remove(child) {
        if (child.parent !== this.id.id)
            return;
        child.parent = undefined;
        this.addNewEvent(ItemEvent.ChildrenRemoved, { children: [child.id.id] });
        child.addNewEvent(ItemEvent.ParentChanged, { parent: null });
    }
    static new(title, type) {
        const feature = new Feature(randomUUID(), source.EntityVersion.new);
        feature.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Feature });
        return feature;
    }
    static reconstitute(id, version, events) {
        const feature = new Feature(id, version);
        for (const event of events) {
            switch (event.name) {
                case ItemEvent.Created:
                case 'TypeChanged':
                    guard.isIn([ItemType.Epic, ItemType.Feature])(event.details.type);
                    feature.itemType = event.details.type;
                    break;
                case ItemEvent.ParentChanged:
                    feature.parent = event.details.parent;
                    break;
                default: break;
            }
        }
        return feature;
    }
    constructor(id, version) {
        super(new source.CanonicalEntityId(id, Feature.TYPE_CODE), version);
        this.itemType = ItemType.Feature;
        this.addNewEvent = (event, details) => {
            this.unpublishedEvents.push(new source.UnpublishedEvent(event, details));
        };
    }
    removeEventMatching(predicate) {
        const existingEvent = this.unpublishedEvents.findIndex(predicate);
        if (existingEvent < 0)
            return;
        this.unpublishedEvents.splice(existingEvent, 1);
    }
}
Feature.TYPE_CODE = 'Feature';
