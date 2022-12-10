import { Entity } from './es/event-publisher.js'

export interface EventPublisher {
  publishChanges(items: Entity | Entity[], actor: string): Promise<void>
}
