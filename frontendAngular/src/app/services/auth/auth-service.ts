import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { supabase } from '../../core/config/supabase';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

interface GoogleAuthResponse {
  token?: string;
  success?: boolean;
  user?: {
    _id?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  constructor(private http: HttpClient) {}

  async loginWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error.message);
    }
  }

  async handleAuthCallback() {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.user) {
      console.error(error?.message);
      return;
    }

    const user = session.user;

    const payload = {
      email: user.email,
      name: user.user_metadata?.['full_name'],
      avatar: user.user_metadata?.['avatar_url'],
    };

    const response = await firstValueFrom(
      this.http.post<GoogleAuthResponse>(
        `${environment.backendUrl}/auth/google`,
        payload,
        {
          withCredentials: true,
        }
      )
    );

    if (response.token) {
      localStorage.setItem('token', response.token);
    }

    if (response.user?._id) {
      localStorage.setItem('userId', response.user._id);
    }

    return response;
  }

  logout() {
    return this.http.post(`${environment.backendUrl}/auth/logout`, {}, { withCredentials: true });
  }
}
