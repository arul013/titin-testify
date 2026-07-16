export type UserRole = 'super_admin' | 'admin' | 'peserta';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserRequest {
  username?: string;
  full_name?: string;
  is_active?: boolean;
  avatar_url?: string | null;
}

export interface ChangeRoleRequest {
  role: UserRole;
}

export interface UserProfile {
  id: string;
  email?: string;
  username: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  is_active: boolean;
  force_change_password?: boolean;
  created_at?: string;
  updated_at?: string;
}



export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserListResponse {
  users: UserProfile[];
  total: number;
  page: number;
  per_page: number;
}

export interface MessageResponse {
  message: string;
  success: boolean;
}
