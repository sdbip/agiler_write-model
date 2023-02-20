import { guard } from '../../guard-clauses.js'

export class CanonicalEntityId {
  constructor(readonly id: string, readonly type: string) {
    guard.isString(id, 'id')
    guard.isString(type, 'type')
  }

  equals(other: CanonicalEntityId): any {
    return other.id === this.id && other.type === this.type
  }

  toString() {
    return `[${this.type} ${this.id}]`
  }
}

export class EntityVersion {
  static new = new EntityVersion(-1)

  private constructor(readonly value: number) { }

  static of(value: number) {
    guard.isNumber(value, 'version')
    guard.that(value >= 0, 'version must not be negative')
    return new EntityVersion(value)
  }

  equals(other: EntityVersion) {
    guard.isInstanceOf(EntityVersion)(other, 'other')
    return other.value === this.value
  }

  next(): EntityVersion {
    return EntityVersion.of(this.value + 1)
  }

  toString() {
    return `[version ${this.value}]`
  }
}

export class UnpublishedEvent {
  constructor(readonly name: string, readonly details: any) {
    guard.isString(name, 'name')
    guard.isObject(details, 'details')
  }
}

export class PublishedEvent {
  constructor(readonly name: string, readonly details: Record<string, any>) { }
}

export class EntityHistory {
  constructor(readonly type: string, readonly version: EntityVersion, readonly events: PublishedEvent[]) { }
}

export abstract class Entity {
  public readonly unpublishedEvents: UnpublishedEvent[] = []

  constructor(readonly id: CanonicalEntityId, readonly version: EntityVersion) {
    guard.isInstanceOf(CanonicalEntityId)(id, 'id')
    guard.isInstanceOf(EntityVersion)(version, 'version')
  }
}
