import { assert } from 'chai'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { Task } from '../../src/domain/task.js'
import { reconstituteStory } from './reconstitute.js'
import { EntityVersion } from '../../src/es/source.js'

describe('Task.promote', () => {

  it('promotes a Task to a Story', () => {
    const task = Task.reconstitute('id', EntityVersion.new, [])
    task.promote()
    assert.equal(task.unpublishedEvents.length, 1)

    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.TypeChanged)
    assert.equal(event?.details.type, ItemType.Story)
  })

  it('throws if promoted from Story', () => {
    const task = reconstituteStory('id')
    assert.throws(() => task.promote())
    assert.lengthOf(task.unpublishedEvents, 0)
  })
})
