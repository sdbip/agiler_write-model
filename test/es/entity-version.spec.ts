import { assert } from 'chai'
import { EntityVersion } from '../../src/es/entity-version'

describe(EntityVersion.name, () => {

  it('equals other version with same value', () => {
    assert.isTrue(EntityVersion.of(1).equals(EntityVersion.of(1)))
  })

  it('does not equal version with different value', () => {
    assert.isFalse(EntityVersion.of(0).equals(EntityVersion.of(1)))
  })

  it('has a `new` state which is not a positive number', () => {
    assert.isBelow(EntityVersion.new.value, 0)
  })

  it('can be incremented', () => {
    assert.deepEqual(EntityVersion.of(0).next(), EntityVersion.of(1))
  })

  it('starts at zero', () => {
    assert.deepEqual(EntityVersion.new.next(), EntityVersion.of(0))
  })
})
