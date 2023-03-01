import { randomUUID } from 'crypto';
import { guard } from '../guard-clauses.js';
import * as source from '../es/source.js';
import { ItemEvent, ItemType, Progress } from './enums.js';
export class Task extends source.Entity {
    add(child) {
        // if (child.parent == this.id.id) return
        guard.that(child.parent === undefined, 'Item must not have other parent');
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
    finish() {
        // guard.isEmpty(this.children)
        this.addNewEvent(ItemEvent.ProgressChanged, { progress: Progress.Completed });
    }
    static new(title, type) {
        const item = new Task(randomUUID(), source.EntityVersion.new);
        item.addNewEvent(ItemEvent.Created, { title, type: type ?? ItemType.Task });
        return item;
    }
    static reconstitute(id, version, events) {
        const item = new Task(id, version);
        for (const event of events) {
            switch (event.name) {
                case ItemEvent.Created:
                case 'TypeChanged':
                    guard.isIn([ItemType.Story, ItemType.Task])(event.details.type);
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
        super(new source.CanonicalEntityId(id, Task.TYPE_CODE), version);
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
Task.TYPE_CODE = 'Task';
