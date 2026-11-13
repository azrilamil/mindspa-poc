import '@testing-library/jest-dom/vitest'

/**
 * Test setup.
 *
 * Two browser APIs jsdom does not implement are stubbed here rather than in every
 * test: `matchMedia`, which the responsive chrome asks for, and
 * `HTMLMediaElement.play`, which rejects in jsdom because there is no audio stack.
 * The stubs are minimal on purpose: a test that needs richer media behaviour
 * replaces the element itself.
 */

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  })
}

if (typeof HTMLMediaElement !== 'undefined') {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: () => Promise.resolve(),
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: () => undefined,
  })
  Object.defineProperty(HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: () => undefined,
  })
}

// Keep the console quiet about expected React act() warnings from timers that a
// test drives by hand. Real errors still surface.
const originalError = console.error
console.error = (...args: unknown[]) => {
  const first = args[0]
  if (typeof first === 'string' && first.includes('not wrapped in act')) return
  originalError(...args)
}
