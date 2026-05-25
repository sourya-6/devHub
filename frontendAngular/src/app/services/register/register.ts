import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User } from '../login/user';
import { environment } from '../../../environments/environment';

export interface RegisterTemplate {
  name: string;
  username: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class Register {
  private readonly baseUrl = environment.backendUrl;
  constructor(private http: HttpClient) { }

  registerUser(userData: RegisterTemplate): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/auth/register`, userData, {
      withCredentials: true,
    }).pipe(
      tap((item) => {
        localStorage.setItem("token", item.token);
        localStorage.setItem("userId", item.user._id);
      })
    );
  }
}
