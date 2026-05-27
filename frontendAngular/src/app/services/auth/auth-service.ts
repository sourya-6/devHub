import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface GoogleAuthResponse {
  token?: string;
  success?: boolean;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    avatar?: string;
    username?: string;
  };
}

interface GoogleAuthPayload {
  email: string;
  name: string;
  avatar?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private googleScriptLoaded = false;

  constructor(private http: HttpClient) {}

  /**
   * Initialize Google Sign-In library
   * Load the Google Identity Services script for OAuth flow
   */
  initializeGoogleSignIn() {
    if (this.googleScriptLoaded) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Sign-In library loaded');
      // Initialize Google Sign-In with client ID from environment
      if (window['google']?.accounts?.id && environment.googleClientId && environment.googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
        window['google'].accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: this.handleGoogleSignInResponse.bind(this),
        });
      }
    };
    document.head.appendChild(script);
    this.googleScriptLoaded = true;
  }

  /**
   * Handle Google OAuth ID token response and exchange for backend JWT
   * Decodes the JWT token to extract user information
   */
  private async handleGoogleSignInResponse(response: any) {
    if (response.credential) {
      try {
        // Decode JWT token (without verification on client side)
        const tokenPayload = this.decodeGoogleToken(response.credential);
        if (tokenPayload) {
          await this.loginWithGoogle({
            email: tokenPayload.email,
            name: tokenPayload.name,
            avatar: tokenPayload.picture,
          });
        }
      } catch (error) {
        console.error('Failed to decode Google token:', error);
      }
    }
  }

  /**
   * Decode Google ID token (JWT format)
   * Note: This assumes the token is from Google and hasn't been tampered with.
   * In production, you should verify the token signature on the backend.
   */
  private decodeGoogleToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }

  /**
   * Send Google user profile to backend for validation and JWT issuance
   */
  async loginWithGoogle(payload: GoogleAuthPayload) {
    try {
      const response = await firstValueFrom(
        this.http.post<GoogleAuthResponse>(
          `${environment.backendUrl}/auth/google`,
          payload,
          { withCredentials: true }
        )
      );

      if (response.token) {
        localStorage.setItem('token', response.token);
      }

      if (response.user?.id) {
        localStorage.setItem('userId', response.user.id);
      }

      return response;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  }

  /**
   * Email/password login
   */
  async loginWithEmail(email: string, password: string) {
    try {
      const response = await firstValueFrom(
        this.http.post<GoogleAuthResponse>(
          `${environment.backendUrl}/auth/login`,
          { email, password },
          { withCredentials: true }
        )
      );

      if (response.token) {
        localStorage.setItem('token', response.token);
      }

      if (response.user?.id) {
        localStorage.setItem('userId', response.user.id);
      }

      return response;
    } catch (error) {
      console.error('Email login failed:', error);
      throw error;
    }
  }

  /**
   * Email/password registration
   */
  async registerWithEmail(
    name: string,
    username: string,
    email: string,
    password: string
  ) {
    try {
      const response = await firstValueFrom(
        this.http.post<GoogleAuthResponse>(
          `${environment.backendUrl}/auth/register`,
          { name, username, email, password },
          { withCredentials: true }
        )
      );

      if (response.token) {
        localStorage.setItem('token', response.token);
      }

      if (response.user?.id) {
        localStorage.setItem('userId', response.user.id);
      }

      return response;
    } catch (error) {
      console.error('Email register failed:', error);
      throw error;
    }
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    return this.http.post(`${environment.backendUrl}/auth/logout`, {}, { withCredentials: true });
  }
}
