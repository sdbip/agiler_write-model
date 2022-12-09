import { assert } from 'chai'
import { Item } from '../../src/domain/item.js'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { reconstitute } from './reconstitute.js'

describe('Item.add', () => {

  it('adds a Task to a Story', () => {
    const story = reconstitute.story('story_id')
    const task = reconstitute.task('task_id')
    story.add(task)
    const event = story.unpublishedEvents.find(e => e.name === ItemEvent.ChildrenAdded)
    assert.deepEqual(event?.details.children, [ task.id ])
  })

  it('sets the parent of a Task', () => {
    const story = reconstitute.story('story_id')
    const task = reconstitute.task('task_id')
    story.add(task)
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.ParentChanged)
    assert.equal(event?.details.parent, story.id)
  })

  it('adds an MMF to a Feature', () => {
    const epic = reconstitute.feature('epic_id')
    const mmf = reconstitute.feature('mmf_id')
    epic.add(mmf)
    const event = epic.unpublishedEvents.find(e => e.name === ItemEvent.ChildrenAdded)
    assert.deepEqual(event?.details.children, [ mmf.id ])
  })

  it('sets the parent of an MMF', () => {
    const epic = reconstitute.feature('epic_id')
    const mmf = reconstitute.feature('mmf_id')
    epic.add(mmf)
    const event = mmf.unpublishedEvents.find(e => e.name === ItemEvent.ParentChanged)
    assert.equal(event?.details.parent, epic.id)
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

  it('doesn\'t remove "Created" event', () => {
    const storyId = 'story_id'

    const task = Item.new('New task')
    const story = reconstitute.story(storyId)
    story.add(task)

    const events = task.unpublishedEvents.filter(e => e.name === ItemEvent.Created)
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

  it('throws if the Task already has a parent', () => {
    const story = reconstitute.story('story_id')
    const task = reconstitute.taskWithParent('other_story', 'task_id')
    assert.throws(() => story.add(task))
    assert.lengthOf(story.unpublishedEvents, 0)
    assert.lengthOf(task.unpublishedEvents, 0)
  })

  it('throws if parent is not a Story', () => {
    const task1 = reconstitute.task('task1_id')
    const task2 = reconstitute.task('task2_id')
    assert.throws(() => task1.add(task2))
    assert.lengthOf(task1.unpublishedEvents, 0)
    assert.lengthOf(task2.unpublishedEvents, 0)
  })

  it('throws if added item is not a Task', () => {
    const task = reconstitute.task('task_id')
    const story = reconstitute.story('story_id')
    assert.throws(() => task.add(story))
    assert.lengthOf(task.unpublishedEvents, 0)
    assert.lengthOf(story.unpublishedEvents, 0)
  })
})
