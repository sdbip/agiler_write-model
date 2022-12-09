import { Entity } from './es/event-publisher.js'

export interface EventPublisher {
  publishChanges(item: Entity, arg1: string): Promise<void>
}
