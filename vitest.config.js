// vitest.config.js
import { defineConfig } from 'vitest/config';   
// import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    // Forces Vitest to load .env.test specifically
    envFile: '.env.test', 
  },
});