// Common types used across services
export interface BaseResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
}
