import { NotificationManager } from '../notifications'

// Mock the entire Notification API
const mockNotification = jest.fn(() => ({
  close: jest.fn(),
}))

Object.defineProperty(global, 'Notification', {
  writable: true,
  value: mockNotification
})

Object.defineProperty(mockNotification, 'permission', {
  writable: true,
  value: 'default'
})

Object.defineProperty(mockNotification, 'requestPermission', {
  writable: true,
  value: jest.fn(() => Promise.resolve('granted'))
})

// Ensure Notification is available in window
Object.defineProperty(global, 'window', {
  writable: true,
  value: {
    ...global.window,
    Notification: mockNotification
  }
})

describe('NotificationManager', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset localStorage mock
    global.localStorage.getItem = jest.fn().mockReturnValue('false')
    global.localStorage.setItem = jest.fn()
    // Reset permission
    mockNotification.permission = 'default'
  })

  describe('basic functionality', () => {
    it('should create instance without errors', () => {
      expect(() => new NotificationManager()).not.toThrow()
    })

    it('should check if notifications can be requested', () => {
      const manager = new NotificationManager()
      expect(typeof manager.canRequest).toBe('function')
    })

    it('should have enable and disable methods', () => {
      const manager = new NotificationManager()
      expect(typeof manager.enable).toBe('function')
      expect(typeof manager.disable).toBe('function')
    })

    it('should have notification methods', () => {
      const manager = new NotificationManager()
      expect(typeof manager.showNotification).toBe('function')
      expect(typeof manager.showMessageNotification).toBe('function')
      expect(typeof manager.showDirectMessageNotification).toBe('function')
    })
  })

  describe('permission handling', () => {
    it('should return true when permission is already granted', async () => {
      mockNotification.permission = 'granted'
      const manager = new NotificationManager()

      const result = await manager.requestPermission()
      expect(result).toBe(true)
    })

    it('should return false when permission is denied', async () => {
      mockNotification.permission = 'denied'
      const manager = new NotificationManager()

      const result = await manager.requestPermission()
      expect(result).toBe(false)
    })
  })

  describe('notification display', () => {
    it('should return null when notifications are disabled', () => {
      mockNotification.permission = 'granted'
      global.localStorage.getItem = jest.fn().mockReturnValue('false')
      const manager = new NotificationManager()

      const result = manager.showNotification('Test')
      expect(result).toBeNull()
    })

    it('should return null when permission is not granted', () => {
      mockNotification.permission = 'default'
      global.localStorage.getItem = jest.fn().mockReturnValue('true')
      const manager = new NotificationManager()

      const result = manager.showNotification('Test')
      expect(result).toBeNull()
    })
  })

  describe('message formatting', () => {
    it('should format message notifications correctly', () => {
      mockNotification.permission = 'granted'
      global.localStorage.getItem = jest.fn().mockReturnValue('true')
      const manager = new NotificationManager()

      // This should not throw
      expect(() => {
        manager.showMessageNotification('John', 'Hello world', 'General')
      }).not.toThrow()
    })

    it('should format direct message notifications correctly', () => {
      mockNotification.permission = 'granted'
      global.localStorage.getItem = jest.fn().mockReturnValue('true')
      const manager = new NotificationManager()

      // This should not throw
      expect(() => {
        manager.showDirectMessageNotification('Jane', 'Hi there')
      }).not.toThrow()
    })
  })
})