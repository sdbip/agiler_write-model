import { assert } from 'chai'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { reconstitute } from './reconstitute.js'

describe('Item.add', () => {

  it('adds an MMF to a Feature', () => {
    const epic = reconstitute.feature('epic_id')
    const mmf = reconstitute.feature('mmf_id')
    epic.add(mmf)
    const event = epic.unpublishedEvents.find(e => e.name === ItemEvent.ChildrenAdded)
    assert.deepEqual(event?.details.children, [ mmf.id.id ])
  })

  it('sets the parent of an MMF', () => {
    const epic = reconstitute.feature('epic_id')
    const mmf = reconstitute.feature('mmf_id')
    epic.add(mmf)
    const event = mmf.unpublishedEvents.find(e => e.name === ItemEvent.ParentChanged)
    assert.equal(event?.details.parent, epic.id.id)
  })

  it('converts the parent Feature to an Epic', () => {
    const epic = reconstitute.feature('epic_id')
    const mmf = reconstitute.feature('mmf_id')
    epic.add(mmf)
    const event = epic.unpublishedEvents.find(e => e.name === ItemEvent.TypeChanged)
    assert.equal(event?.details.type, ItemType.Epic)
  })

  it('only updates parent once', () => {
    const taskId = 'task_id'
    const oldParentId = 'old_parent_id'
    const newParentId = 'new_parent_id'

    const task = reconstitute.taskWithParent(oldParentId, taskId)
    const oldParent = reconstitute.storyWithChildren([ taskId ], oldParentId)
    oldParent.remove(task)

    const newParent = reconstitute.story(newParentId)
    newParent.add(task)

    const events = task.unpublishedEvents.filter(e => e.name === ItemEvent.ParentChanged)
    assert.lengthOf(events, 1)
  })

  it('sets the last parent', () => {
    const taskId = 'task_id'
    const oldParentId = 'old_parent_id'
    const newParentId = 'new_parent_id'

    const task = reconstitute.taskWithParent(oldParentId, taskId)
    const oldParent = reconstitute.storyWithChildren([ taskId ], oldParentId)
    oldParent.remove(task)

    const newParent = reconstitute.story(newParentId)
    newParent.add(task)

    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.ParentChanged)
    assert.equal(event?.details.parent, newParentId)
  })
})
