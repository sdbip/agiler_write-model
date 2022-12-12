import { assert } from 'chai'
import { Item } from '../../src/domain/item.js'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { EntityVersion } from '../../src/es/source.js'

describe('Item.new', () => {

  it('is `new`', () => {
    const item = Item.new('Get it done')
    assert.equal(item.version, EntityVersion.new)
  })

  it('has a unique id', () => {
    const item1 = Item.new('Get it done')
    const item2 = Item.new('Get it done')

    assert.notEqual(item1.id, item2.id)
  })

  it('has a uuid id', () => {
    const item = Item.new('Get it done')

    assert.match(item.id.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('is created as a Task', () => {
    const item = Item.new('Get it done')
    assert.equal(item.unpublishedEvents.length, 1)
    const event = item.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.type, ItemType.Task)
  })

  it('can be created as a Feature', () => {
    const item = Item.new('Get it done', ItemType.Feature)
    assert.equal(item.unpublishedEvents.length, 1)
    const event = item.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.type, ItemType.Feature)
  })

  it('is created with a title', () => {
    const item = Item.new('Get it done')
    assert.equal(item.unpublishedEvents.length, 1)
    const event = item.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.title, 'Get it done')
  })
})
