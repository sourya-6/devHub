import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { NotificationService } from '../notifications/notifications';

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
  private googleScriptPromise?: Promise<void>;

  constructor(
    private http: HttpClient,
    private router: Router,
    private zone: NgZone,
    private notificationService: NotificationService,
  ) {}

  private connectNotifications() {
    queueMicrotask(() => this.notificationService.connect());
  }

  /**
   * Initialize Google Sign-In library
   * Load the Google Identity Services script for OAuth flow
   */
  initializeGoogleSignIn(): Promise<void> {
    if (this.googleScriptLoaded) {
      return Promise.resolve();
    }

    if (this.googleScriptPromise) {
      return this.googleScriptPromise;
    }

    this.googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('Google Sign-In library loaded');

        if (!environment.googleClientId || environment.googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
          reject(new Error('Google client ID is not configured'));
          return;
        }

        if (!(window as any).google?.accounts?.id) {
          reject(new Error('Google Sign-In library is unavailable'));
          return;
        }

        (window as any).google.accounts.id.initialize({
          client_id: environment.googleClientId,
          callback: this.handleGoogleSignInResponse.bind(this),
        });

        this.googleScriptLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load Google Sign-In library'));
      document.head.appendChild(script);
    });

    return this.googleScriptPromise;
  }

  async promptGoogleSignIn() {
    await this.initializeGoogleSignIn();

    const googleIdentity = (window as any).google?.accounts?.id;
    if (!googleIdentity) {
      throw new Error('Google Sign-In library is unavailable');
    }

    googleIdentity.prompt((notification: any) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        console.warn('Google Sign-In prompt was not displayed', notification.getNotDisplayedReason?.() || notification.getSkippedReason?.());
      }
    });
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
          const loginResponse = await this.loginWithGoogle({
            email: tokenPayload.email,
            name: tokenPayload.name,
            avatar: tokenPayload.picture,
          });

          if (loginResponse?.token) {
            await this.zone.run(async () => {
              await this.router.navigate(['/dashboard']);
            });
          }
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
   * Accept a raw Google ID token (credential), decode it and call loginWithGoogle
   */
  async loginWithGoogleToken(token: string) {
    const tokenPayload = this.decodeGoogleToken(token);
    if (!tokenPayload) {
      throw new Error('Invalid Google token');
    }

    return this.loginWithGoogle({
      email: tokenPayload.email,
      name: tokenPayload.name || tokenPayload.email?.split('@')[0],
      avatar: tokenPayload.picture,
    });
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

      this.connectNotifications();

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

      this.connectNotifications();

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

      this.connectNotifications();

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
