import { EntityHistory } from './es/entity-history.js'

export interface EntityRepository {
  getHistoryFor(id: string): Promise<EntityHistory | undefined>
}
