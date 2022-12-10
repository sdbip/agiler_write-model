import { failFast } from './fail-fast.js';
export class UnpublishedEvent {
    constructor(name, details) {
        this.name = name;
        this.details = details;
        failFast.unlessString(name, 'name');
        failFast.unlessObject(details, 'details');
    }
}
