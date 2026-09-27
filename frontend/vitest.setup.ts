import '@testing-library/jest-dom/vitest';

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one to mount.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
