/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, expect, it } from 'vitest'

import { buildQueryParams } from '../filters'

describe('buildQueryParams', () => {
  const timeRange = { start_timestamp: 1000, end_timestamp: 2000 }

  it('passes model and API key filters through to the quota API', () => {
    expect(
      buildQueryParams(timeRange, {
        time_granularity: 'day',
        username: 'alice',
        model_name: 'gpt-6.1-sol',
        token_name: 'cpa-gpt',
        channel: 2,
      })
    ).toEqual({
      start_timestamp: 1000,
      end_timestamp: 2000,
      default_time: 'day',
      username: 'alice',
      model_name: 'gpt-6.1-sol',
      token_name: 'cpa-gpt',
      channel: 2,
    })
  })

  it('omits the channel filter when it is unset', () => {
    const params = buildQueryParams(timeRange, {
      time_granularity: 'day',
      channel: 0,
    })
    expect(params).not.toHaveProperty('channel')
  })

  it('omits model and API key filters when they are empty', () => {
    const params = buildQueryParams(timeRange, {
      time_granularity: 'day',
      model_name: '',
      token_name: '',
    })
    expect(params).not.toHaveProperty('model_name')
    expect(params).not.toHaveProperty('token_name')
  })
})
