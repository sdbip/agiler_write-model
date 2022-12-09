import { assert } from 'chai'
import { ItemEvent } from '../../src/domain/enums.js'
import {
  reconstituteStory,
  reconstituteStoryWithChildren,
  reconstituteTask,
  reconstituteTaskWithParent,
} from './reconstitute.js'

describe('Item.remove', () => {

  it('removes a Task from a Story', () => {
    const taskId = 'task_id'
    const storyId = 'story_id'

    const story = reconstituteStoryWithChildren([ taskId ], storyId)
    const task = reconstituteTaskWithParent(storyId, taskId)
    story.remove(task)
    const event = story.unpublishedEvents.find(e => e.name === ItemEvent.ChildrenRemoved)
    assert.deepEqual(event?.details.children, [ taskId ])
  })

  it('unsets the Task\'s parent', () => {
    const taskId = 'task_id'
    const storyId = 'story_id'

    const story = reconstituteStoryWithChildren([ taskId ], storyId)
    const task = reconstituteTaskWithParent(storyId, taskId)
    story.remove(task)
    const event = task.unpublishedEvents.find(e => e.name === ItemEvent.ParentChanged)
    assert.isNull(event?.details.parent)
  })

  it('ignores tasks that are not children', () => {
    const story = reconstituteStory('story_id')
    const task = reconstituteTask('task_id')
    story.remove(task)
    assert.lengthOf(story.unpublishedEvents, 0)
    assert.lengthOf(task.unpublishedEvents, 0)
  })
})
