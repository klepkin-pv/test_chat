import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return ''
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock Notification API
const mockNotification = {
  close: jest.fn(),
}
global.Notification = jest.fn(() => mockNotification)
Object.defineProperty(global.Notification, 'permission', {
  writable: true,
  value: 'default',
})
Object.defineProperty(global.Notification, 'requestPermission', {
  writable: true,
  value: jest.fn(() => Promise.resolve('granted')),
})

// Mock WebSocket
global.WebSocket = jest.fn(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock AudioContext
global.AudioContext = jest.fn(() => ({
  createOscillator: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    frequency: { setValueAtTime: jest.fn() },
    type: 'sine'
  })),
  createGain: jest.fn(() => ({
    connect: jest.fn(),
    gain: { setValueAtTime: jest.fn() }
  })),
  createBuffer: jest.fn(() => ({
    getChannelData: jest.fn(() => new Float32Array(1024)),
    length: 1024
  })),
  createBufferSource: jest.fn(() => ({
    connect: jest.fn(),
    start: jest.fn(),
    buffer: null
  })),
  destination: {},
  sampleRate: 44100,
  state: 'running',
  resume: jest.fn(() => Promise.resolve())
}))
global.webkitAudioContext = global.AudioContext

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = jest.fn(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}))