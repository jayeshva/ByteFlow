import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { useAutomations } from '../useQueries';
import { MetaApiService } from '../../services/api';
import React from 'react';
import { Provider } from 'react-redux';
import store from '../../store/store';


// Mock the MetaApiService
vi.mock('../../services/api', () => ({
  MetaApiService: {
    getAutomations: vi.fn(),
  },
  SubscriptionService: {
    getCurrentSubscription: vi.fn(),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </Provider>
);


describe('useAutomations hook', () => {
  it('should fetch automations successfully', async () => {
    const mockData = [
      { id: '1', flowName: 'Test Flow', active: true, stats: { totalSent: 10 } },
    ];
    (MetaApiService.getAutomations as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useAutomations(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle error when fetching automations', async () => {
    const error = new Error('Failed to fetch');
    (MetaApiService.getAutomations as any).mockRejectedValue(error);

    const { result } = renderHook(() => useAutomations(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBe(error);
  });
});
