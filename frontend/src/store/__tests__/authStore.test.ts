import { useAuthStore } from '../authStore'

describe('AuthStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.getState().logout() // Reset store
  })

  describe('login', () => {
    it('should login successfully with user and token', () => {
      const user = { id: '1', username: 'testuser', email: 'test@example.com' }
      const token = 'test-token'

      const { login } = useAuthStore.getState()
      login(user, token)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(user)
      expect(state.token).toBe(token)
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe('logout', () => {
    it('should clear user data and token', () => {
      // Set initial state
      const user = { id: '1', username: 'testuser', email: 'test@example.com' }
      useAuthStore.getState().login(user, 'test-token')

      const { logout } = useAuthStore.getState()
      logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })
})