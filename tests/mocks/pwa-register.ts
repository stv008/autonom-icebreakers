// Test double for `virtual:pwa-register` (vite-plugin-pwa); aliased in vitest.config.ts.
export function registerSW(): (reload?: boolean) => Promise<void> {
  return async () => undefined;
}
