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

import { getChannels } from '@/features/channels/api'
import type { Channel } from '@/features/channels/types'
import { getApiKeys, getTokenNames } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'
import { getUserModels } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import type {
  DashboardChartPreferences,
  DashboardFilters,
} from '../../../types'
import { ModelsFilter } from '../models-filter-dialog'

// The dialog fetches its dropdown options from the APIs; stub them so the
// tests do not hit the network. Other exports of these modules stay intact.
vi.mock('@/lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api')>()),
  getUserModels: vi.fn(),
}))
vi.mock('@/features/keys/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/keys/api')>()),
  getApiKeys: vi.fn(),
  getTokenNames: vi.fn(),
}))
vi.mock('@/features/channels/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/channels/api')>()),
  getChannels: vi.fn(),
}))

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

function buildFilters(
  overrides: Partial<DashboardFilters> = {}
): DashboardFilters {
  return {
    start_timestamp: new Date('2026-11-10T00:00:00Z'),
    end_timestamp: new Date('2026-11-13T00:00:00Z'),
    time_granularity: 'day',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getUserModels).mockResolvedValue({
    success: true,
    data: ['gpt-6.1-sol', 'claude-fable-5-2'],
  })
  vi.mocked(getTokenNames).mockResolvedValue({
    success: true,
    data: ['cpa-gpt', 'cpa-claude'],
  })
  vi.mocked(getApiKeys).mockResolvedValue({
    success: true,
    data: {
      items: [{ id: 7, name: 'cpa-gpt' } as ApiKey],
      total: 1,
      page: 1,
      page_size: 100,
    },
  })
  vi.mocked(getChannels).mockResolvedValue({
    success: true,
    data: {
      items: [{ id: 2, name: 'urtoken-sohan-claude' } as Channel],
      total: 1,
      page: 1,
      page_size: 100,
    },
  })
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
  it('shows model and API key dropdowns for model analytics and applies them', async () => {
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

    await user.click(modelInput)
    await user.click(
      await screen.findByRole('option', { name: 'claude-fable-5-2' })
    )
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

    expect(onFilterChange).toHaveBeenCalledTimes(1)
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({
        model_name: 'claude-fable-5-2',
        token_name: 'cpa-gpt',
      })
    )
  })

  it('still accepts a typed model name not present in the dropdown', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()
    render(
      <ModelsFilter
        preferences={preferences}
        currentFilters={buildFilters()}
        onFilterChange={onFilterChange}
        onReset={vi.fn()}
        showModelTokenFilters
      />
    )

    await user.click(screen.getByRole('button', { name: 'Filter' }))

    const modelInput = await screen.findByLabelText('Model')
    await user.click(modelInput)
    await user.type(modelInput, 'some-retired-model')
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

    expect(onFilterChange).toHaveBeenCalledTimes(1)
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ model_name: 'some-retired-model' })
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

  it('shows the channel dropdown only to admins and applies it', async () => {
    const user = userEvent.setup()
    useAuthStore.getState().auth.setUser({
      id: 9,
      username: 'hopai',
      role: 100,
      quota: 1000000,
      used_quota: 1000,
      request_count: 1,
    })
    const onFilterChange = vi.fn()
    render(
      <ModelsFilter
        preferences={preferences}
        currentFilters={buildFilters()}
        onFilterChange={onFilterChange}
        onReset={vi.fn()}
        showModelTokenFilters
      />
    )

    await user.click(screen.getByRole('button', { name: 'Filter' }))

    const channelInput = await screen.findByLabelText('Channel')
    await user.click(channelInput)
    await user.click(
      await screen.findByRole('option', {
        name: 'urtoken-sohan-claude (#2)',
      })
    )
    await user.click(screen.getByRole('button', { name: 'Apply Filters' }))

    expect(onFilterChange).toHaveBeenCalledTimes(1)
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 2 })
    )
  })

  it('hides the channel input from non-admin users', async () => {
    const user = userEvent.setup()
    render(
      <ModelsFilter
        preferences={preferences}
        currentFilters={buildFilters()}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        showModelTokenFilters
      />
    )

    await user.click(screen.getByRole('button', { name: 'Filter' }))
    await screen.findByLabelText('Model')

    expect(screen.queryByLabelText('Channel')).not.toBeInTheDocument()
  })
})
