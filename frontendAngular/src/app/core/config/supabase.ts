/**
 * Authentication Configuration
 * Supabase has been removed - using Nest backend JWT authentication instead
 * All authentication is now handled by the backend at environment.backendUrl
 */

export const authConfig = {
  tokenKey: 'token',
  userIdKey: 'userId',
  
  /**
   * Get stored JWT token from localStorage
   */
  getToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  },
  
  /**
   * Get stored user ID from localStorage
   */
  getUserId: (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('userId');
  },
  
  /**
   * Check if user is authenticated
   */
  isAuthenticated: (): boolean => {
    return authConfig.getToken() !== null && authConfig.getUserId() !== null;
  },
  
  /**
   * Clear authentication data
   */
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
    }
  },
};