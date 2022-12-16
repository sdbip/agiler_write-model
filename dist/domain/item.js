import { randomUUID } from 'crypto';
import { failFast } from '../fail-fast.js';
import * as source from '../es/source.js';
import { ItemEvent, ItemType, Progress } from './enums.js';
export class Item extends source.Entity {
    promote() {
        failFast.unless(this.itemType === ItemType.Task, `Only ${ItemType.Task} items may be promoted`);
        this.itemType = ItemType.Story;
        this.addNewEvent(ItemEvent.TypeChanged, { type: ItemType.Story });
    }
    add(item) {
        failFast.unless(this.itemType !== ItemType.Task, `${ItemType.Task} items may not have children`);
        failFast.unless(item.parent === undefined, 'Item must not have other parent');
        if (this.itemType === ItemType.Story)
            failFast.unless(item.itemType === ItemType.Task, `Only ${ItemType.Task} items may be added`);
        this.addNewEvent(ItemEvent.ChildrenAdded, { children: [item.id.id] });
        if (this.itemType === ItemType.Feature)
            this.addNewEvent(ItemEvent.TypeChanged, { type: ItemType.Epic });
        item.removeEventMatching(e => e.name === ItemEvent.ParentChanged);
        item.addNewEvent(ItemEvent.ParentChanged, { parent: this.id.id });
    }
    remove(task) {
        if (task.parent !== this.id.id)
            return;
        task.parent = undefined;
        this.addNewEvent(ItemEvent.ChildrenRemoved, { children: [task.id.id] });
        task.addNewEvent(ItemEvent.ParentChanged, { parent: null });
    }
    complete() {
        failFast.unless(this.itemType === ItemType.Task, `Only ${ItemType.Task} items may be completed`);
        this.addNewEvent(ItemEvent.ProgressChanged, { progress: Progress.Completed });
    }
    static new(title, type) {
        const item = new Item(randomUUID(), source.EntityVersion.new);
        item.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Task });
        return item;
    }
    static reconstitute(id, version, events) {
        const item = new Item(id, version);
        for (const event of events) {
            switch (event.name) {
                case ItemEvent.Created:
                case ItemEvent.TypeChanged:
                    item.itemType = event.details.type;
                    break;
                case ItemEvent.ParentChanged:
                    item.parent = event.details.parent;
                    break;
                default: break;
            }
        }
        return item;
    }
    constructor(id, version) {
        super(new source.CanonicalEntityId(id, Item.TYPE_CODE), version);
        this.itemType = ItemType.Task;
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
Item.TYPE_CODE = 'Item';
