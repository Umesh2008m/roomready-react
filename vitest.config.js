import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

// The tests run the app in a pretend browser (jsdom) and use it the way a person would.
export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.jsx'],
  },
}));
