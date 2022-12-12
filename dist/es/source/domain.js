import { failFast } from '../../fail-fast.js';
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
export class EntityVersion {
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        failFast.unlessNumber(value, 'version');
        failFast.unless(value >= 0, 'version must not be negative');
        return new EntityVersion(value);
    }
    equals(other) {
        failFast.unlessInstanceOf(EntityVersion)(other, 'other');
        return other.value === this.value;
    }
    next() {
        return EntityVersion.of(this.value + 1);
    }
    toString() {
        return `[version ${this.value}]`;
    }
}
EntityVersion.new = new EntityVersion(-1);
export class UnpublishedEvent {
    constructor(name, details) {
        this.name = name;
        this.details = details;
        failFast.unlessString(name, 'name');
        failFast.unlessObject(details, 'details');
    }
}
export class PublishedEvent {
    constructor(name, details) {
        this.name = name;
        this.details = details;
    }
}
export class EntityHistory {
    constructor(type, version, events) {
        this.type = type;
        this.version = version;
        this.events = events;
    }
}
export class Entity {
    constructor(id, version) {
        this.id = id;
        this.version = version;
        this.unpublishedEvents = [];
        failFast.unlessInstanceOf(CanonicalEntityId)(id, 'id');
        failFast.unlessInstanceOf(EntityVersion)(version, 'version');
    }
}
