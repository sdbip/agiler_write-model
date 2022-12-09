import { assert } from 'chai'
import { ItemEvent, Progress } from '../../src/domain/enums.js'
import { reconstituteStory, reconstituteTask } from './reconstitute.js'

describe('Item.complete', () => {

  it('completes the task', () => {
    const task = reconstituteTask('id')
    task.complete()
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.ProgressChanged)
    assert.equal(event?.details.progress, Progress.Completed)
  })

  it('throws if not a task', () => {
    const story = reconstituteStory('id')
    assert.throws(() => story.complete())
    assert.lengthOf(story.unpublishedEvents, 0)
  })
})
