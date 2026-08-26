import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { getApiErrorMessage } from '../src/shared/utils/apiErrorMessage'

describe('getApiErrorMessage', () => {
  it('uses the message returned by the backend', () => {
    const error = {
      error: {
        code: 500,
        message: 'Permission denied'
      }
    }

    assert.equal(getApiErrorMessage(error, 'fallback'), 'Permission denied')
  })

  it('uses an Error message when the backend shape is unavailable', () => {
    assert.equal(
      getApiErrorMessage(new Error('Network failed'), 'fallback'),
      'Network failed'
    )
  })

  it('uses the fallback for malformed or anonymous failures', () => {
    assert.equal(getApiErrorMessage({}, 'fallback'), 'fallback')
    assert.equal(getApiErrorMessage(null, 'fallback'), 'fallback')
    assert.equal(
      getApiErrorMessage({ error: { code: 500 } }, 'fallback'),
      'fallback'
    )
  })
})
