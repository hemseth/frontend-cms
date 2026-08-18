export interface User {
  id: string
  name: string
  email: string
  role: string
  avatar?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  isAuthenticated: boolean
}
