import { failFast } from './fail-fast.js';
export class CanonicalEntityId {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        failFast.unlessString(id, 'id');
        failFast.unlessString(type, 'type');
    }
    equals(other) {
        return other.id === this.id && other.type === this.type;
    }
    toString() {
        return `[${this.type} ${this.id}]`;
    }
}
