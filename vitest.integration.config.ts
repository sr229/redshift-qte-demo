import { defineConfig } from 'vitest/config'

// Dedicated config for integration tests that hit a real (local) Supabase
// stack. Kept separate so the default `vitest run` never picks these up via
// the global exclude in vitest.config.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.integration.test.ts'],
    // Integration tests are skipped internally when the Supabase env vars are
    // absent, so they are safe to run anywhere.
  },
})
