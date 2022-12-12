import { assert } from 'chai'
import { CanonicalEntityId } from '../../src/es/source.js'

describe(CanonicalEntityId.name, () => {

  it('equals if same id and type', () => {
    assert.isTrue(new CanonicalEntityId('id', 'type').equals(new CanonicalEntityId('id', 'type')))
  })

  it('does not equal if id is different', () => {
    assert.isFalse(new CanonicalEntityId('id', 'type').equals(new CanonicalEntityId('other_id', 'type')))
  })

  it('does not equal if type is different', () => {
    assert.isFalse(new CanonicalEntityId('id', 'type').equals(new CanonicalEntityId('id', 'other_type')))
  })
})
