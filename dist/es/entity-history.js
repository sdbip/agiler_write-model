export class EntityHistory {
    constructor(type, version, events) {
        this.type = type;
        this.version = version;
        this.events = events;
    }
}
