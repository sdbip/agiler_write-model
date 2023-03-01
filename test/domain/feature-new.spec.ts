import { assert } from 'chai'
import { Feature } from '../../src/domain/feature.js'
import { ItemEvent, ItemType } from '../../src/domain/enums.js'
import { EntityVersion } from '../../src/es/source.js'

describe('Feature.new', () => {

  it('is `new`', () => {
    const feature = Feature.new('Get it done')
    assert.equal(feature.version, EntityVersion.new)
  })

  it('has a unique id', () => {
    const feature1 = Feature.new('Get it done')
    const feature2 = Feature.new('Get it done')

    assert.notEqual(feature1.id, feature2.id)
  })

  it('has a uuid id', () => {
    const feature = Feature.new('Get it done')

    assert.match(feature.id.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('is created as a Feature', () => {
    const feature = Feature.new('Get it done')
    assert.equal(feature.unpublishedEvents.length, 1)
    const event = feature.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.type, ItemType.Feature)
  })

  it('is created with a title', () => {
    const feature = Feature.new('Get it done')
    assert.equal(feature.unpublishedEvents.length, 1)
    const event = feature.unpublishedEvents.find(e => e.name === ItemEvent.Created)
    assert.equal(event?.details.title, 'Get it done')
  })
})
