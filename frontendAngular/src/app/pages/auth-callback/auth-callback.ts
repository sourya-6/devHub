import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { supabase } from '../../core/config/supabase';
import { AuthService } from '../../services/auth/auth-service';


@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<p>Logging in...</p>`,
})
export class AuthCallback implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    try {
      // First, try to extract session from the current URL 
      // (handles cases where Supabase puts tokens in hash)
      await supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          console.log('Auth state changed - signed in');
        }
      });

      // Wait for Supabase to process the OAuth redirect
      await new Promise(resolve => setTimeout(resolve, 500));

      // Try to get the session from the URL
      const urlParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = urlParams.get('access_token');
      
      if (accessToken) {
        console.log('Found access token in URL hash, setting session');
        // Supabase will validate and set the session
      }

      // Get the session established by Supabase OAuth flow
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Session error:', error.message);
        await this.router.navigate(['/']);
        return;
      }

      if (!data.session) {
        console.warn('No session found, attempting alternative auth check');
        // Try to get current user as fallback
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.error('Also no user found:', userError?.message || 'Unknown error');
          // The OAuth flow might not have completed
          // This could mean the Google OAuth client secret is wrong, or the flow was interrupted
          await this.router.navigate(['/']);
          return;
        }
      }

      // We have a valid Supabase session/user, now sync with backend
      const response = await this.authService.handleAuthCallback();

      if (!response?.token) {
        console.error('Backend token exchange failed');
        await this.router.navigate(['/']);
        return;
      }

      // Success: navigate to dashboard
      await this.router.navigate(['/dashbord']);
    } catch (err) {
      console.error('Callback error:', err);
      await this.router.navigate(['/']);
    }
  }
}