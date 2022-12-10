import { CanonicalEntityId } from './canonical-entity-id.js';
import { EntityVersion } from './entity-version.js';
import { failFast } from './fail-fast.js';
export class Entity {
    constructor(id, version) {
        this.id = id;
        this.version = version;
        this.unpublishedEvents = [];
        failFast.unlessInstanceOf(CanonicalEntityId)(id, 'id');
        failFast.unlessInstanceOf(EntityVersion)(version, 'version');
    }
}
