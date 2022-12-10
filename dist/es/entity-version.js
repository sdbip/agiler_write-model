import { failFast } from './fail-fast.js';
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
}
EntityVersion.new = new EntityVersion(-1);
