import { assert } from 'chai'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { Task } from '../../src/domain/task.js'
import { EntityVersion } from '../../src/es/source.js'

describe('Task.new', () => {

  it('is `new`', () => {
    const task = Task.new('Get it done')
    assert.equal(task.version, EntityVersion.new)
  })

  it('has a unique id', () => {
    const task1 = Task.new('Get it done')
    const task2 = Task.new('Get it done')

    assert.notEqual(task1.id, task2.id)
  })

  it('has a uuid id', () => {
    const task = Task.new('Get it done')

    assert.match(task.id.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('is created as a Task', () => {
    const task = Task.new('Get it done')
    assert.equal(task.unpublishedEvents.length, 1)
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.type, ItemType.Task)
  })

  it('can be created as a Feature', () => {
    const task = Task.new('Get it done', ItemType.Feature)
    assert.equal(task.unpublishedEvents.length, 1)
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.type, ItemType.Feature)
  })

  it('is created with a title', () => {
    const task = Task.new('Get it done')
    assert.equal(task.unpublishedEvents.length, 1)
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.title, 'Get it done')
  })
})
