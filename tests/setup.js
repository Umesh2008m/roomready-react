// Runs before every test file: adds matchers such as toBeInTheDocument(), and empties the page after each test.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// The pretend browser (jsdom) has no layout, so it has no ResizeObserver; every real browser does. This stand-in
// watches nothing and never reports a size, which is what a page with no layout would see anyway.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// A test walks through several screens; when every file runs at once the machine is busy, so a test may take longer
// than the default 5 seconds without anything being wrong. Each test file still has to finish in under 20 seconds.
vi.setConfig({ testTimeout: 30_000 });

afterEach(() => cleanup());
