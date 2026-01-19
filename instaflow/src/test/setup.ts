import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { cleanup } from '@testing-library/react';

// Mock server setup would go here if we had handlers
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
    server.resetHandlers();
    cleanup();
});
// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; },
        removeItem: (key: string) => { delete store[key]; },
        length: Object.keys(store).length,
        key: (index: number) => Object.keys(store)[index] || null,
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

afterAll(() => server.close());

