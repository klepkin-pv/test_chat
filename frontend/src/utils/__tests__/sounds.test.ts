import { SoundManager } from '../sounds'

// Mock Audio API
const mockAudio = {
  play: jest.fn(() => Promise.resolve()),
  pause: jest.fn(),
  load: jest.fn(),
  volume: 1,
  currentTime: 0,
}

global.Audio = jest.fn(() => mockAudio)

describe('SoundManager', () => {
  let soundManager: SoundManager

  beforeEach(() => {
    // Reset localStorage mock
    global.localStorage.getItem = jest.fn().mockReturnValue('true')
    global.localStorage.setItem = jest.fn()
    // Create fresh instance for each test
    soundManager = new SoundManager()
  })

  describe('setEnabled', () => {
    it('should set enabled state', () => {
      const manager = new SoundManager()
      
      manager.setEnabled(false)
      expect(manager.isEnabled()).toBe(false)

      manager.setEnabled(true)
      expect(manager.isEnabled()).toBe(true)
    })
  })

  describe('sound playback', () => {
    it('should be enabled when set to true', () => {
      soundManager.setEnabled(true)
      expect(soundManager.isEnabled()).toBe(true)
    })

    it('should be disabled when set to false', () => {
      soundManager.setEnabled(false)
      expect(soundManager.isEnabled()).toBe(false)
    })

    it('should not throw when playing sounds while disabled', () => {
      soundManager.setEnabled(false)
      expect(() => {
        soundManager.playMessageSound()
        soundManager.playNotificationSound()
        soundManager.playTypingSound()
        soundManager.playJoinSound()
      }).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('should handle audio play errors gracefully', () => {
      mockAudio.play.mockRejectedValue(new Error('Audio play failed'))
      
      expect(() => {
        soundManager.playMessageSound()
      }).not.toThrow()
    })
  })
})