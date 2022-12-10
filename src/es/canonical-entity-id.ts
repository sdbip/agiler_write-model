import { failFast } from './fail-fast.js'

export class CanonicalEntityId {
  constructor(readonly id: string, readonly type: string) {
    failFast.unlessString(id, 'id')
    failFast.unlessString(type, 'type')
  }

  equals(other: CanonicalEntityId): any {
    return other.id === this.id && other.type === this.type
  }

  toString() {
    return `[${this.type} ${this.id}]`
  }
}
