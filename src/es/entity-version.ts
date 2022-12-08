import { failFast } from './fail-fast.js'

export class EntityVersion {
  static new = new EntityVersion(-1)

  private constructor(readonly value: number) { }

  static of(value: number) {
    failFast.unlessNumber(value, 'version')
    failFast.unless(value >= 0, 'version must not be negative')
    return new EntityVersion(value)
  }

  equals(other: EntityVersion) {
    failFast.unlessInstanceOf(EntityVersion)(other, 'other')
    return other.value === this.value
  }

  next(): EntityVersion {
    return EntityVersion.of(this.value + 1)
  }
}
