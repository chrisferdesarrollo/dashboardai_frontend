export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
  role?: string[];
}

export interface SignupResponse {
  message: string;
  requiresEmailVerification?: boolean;
  email?: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface EmailVerificationResponse {
  message: string;
  success: boolean;
}

export interface ResendVerificationRequest {
  email: string;
}

export interface JwtResponse {
  accessToken: string;
  tokenType: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  emailVerified?: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<SignupResponse>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
