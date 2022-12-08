import { failFast } from './fail-fast.js'

export class UnpublishedEvent {
  constructor(readonly name: string, readonly details: any) {
    failFast.unlessString(name, 'name')
    failFast.unlessObject(details, 'details')
  }
}
