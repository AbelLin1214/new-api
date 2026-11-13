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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { ModelsFilter } from '../models-filter-dialog'
import type {
  DashboardChartPreferences,
  DashboardFilters,
} from '../../../types'

// jsdom has no Element.getAnimations; Base UI's ScrollArea (used by the
// dialog) calls it on a timer, which otherwise surfaces as an unhandled
// error after the test finishes.
beforeAll(() => {
  if (typeof Element.prototype.getAnimations !== 'function') {
    Object.defineProperty(Element.prototype, 'getAnimations', {
      value: () => [],
      configurable: true,
    })
  }
})

const preferences: DashboardChartPreferences = {
  consumptionDistributionChart: 'bar',
  modelAnalyticsChart: 'trend',
  defaultTimeRangeDays: 7,
  defaultTimeGranularity: 'day',
}

function buildFilters(overrides: Partial<DashboardFilters> = {}): DashboardFilters {
  return {
    start_timestamp: new Date('2026-11-10T00:00:00Z'),
    end_timestamp: new Date('2026-11-13T00:00:00Z'),
    time_granularity: 'day',
    ...overrides,
  }
}

beforeEach(() => {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'dashboard-user',
    role: 1,
    quota: 1000000,
    used_quota: 1000,
    request_count: 1,
  })
})

describe('ModelsFilter model and API key fields', () => {
  it('shows model and API key inputs for model analytics and applies them', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <ModelsFilter
        preferences={preferences}
        currentFilters={buildFilters({
          model_name: 'gpt-6.1-sol',
          token_name: 'cpa-gpt',
        })}
        onFilterChange={onFilterChange}
        onReset={vi.fn()}
        showModelTokenFilters
      />
    )

    await user.click(screen.getByRole('button', { name: 'Filter' }))

    const modelInput = await screen.findByLabelText('Model')
    const tokenInput = await screen.findByLabelText('API Key')
    expect(modelInput).toHaveValue('gpt-6.1-sol')
    expect(tokenInput).toHaveValue('cpa-gpt')

    await user.clear(modelInput)
    await user.type(modelInput, 'claude-fable-5-2')
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

    expect(onFilterChange).toHaveBeenCalledTimes(1)
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        model_name: 'claude-fable-5-2',
        token_name: 'cpa-gpt',
      })
    )
  })

  it('hides model and API key inputs when the view has no such filter', async () => {
    const user = userEvent.setup()
    render(
      <ModelsFilter
        preferences={preferences}
        currentFilters={buildFilters()}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await screen.findByText('Quick Range')

    expect(screen.queryByLabelText('Model')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('API Key')).not.toBeInTheDocument()
  })
})
