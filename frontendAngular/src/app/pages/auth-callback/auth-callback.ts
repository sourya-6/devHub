import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth/auth-service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `<div><p>Processing authentication...</p></div>`,
})
export class AuthCallback implements OnInit {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    try {
      // Extract Google credential token from URL (if using redirect-based OAuth)
      const urlParams = new URLSearchParams(window.location.search);
      const credential = urlParams.get('credential');

      if (credential) {
        try {
          const response = await this.authService.loginWithGoogleToken(credential);
          if (response?.token) {
            await this.router.navigate(['/dashboard']);
            return;
          }
        } catch (error) {
          console.error('Google login failed:', error);
        }
      }

      // If no credential in URL, redirect to login
      if (!credential) {
        console.warn('No credential found in callback');
      }

      await this.router.navigate(['/']);
    } catch (err) {
      console.error('Callback error:', err);
      await this.router.navigate(['/']);
    }
  }
}