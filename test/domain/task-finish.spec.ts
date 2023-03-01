import { assert } from 'chai'
import { ItemEvent, Progress } from '../../src/domain/enums.js'
import { reconstitute } from './reconstitute.js'

describe('Item.complete', () => {

  it('completes the task', () => {
    const task = reconstitute.task('id')
    task.finish()
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.ProgressChanged)
    assert.equal(event?.details.progress, Progress.Completed)
  })

  it('throws if it has children')
})
