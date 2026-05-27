import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse, User } from './user';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Login {
  status: boolean = false;
  private readonly baseUrl = environment.backendUrl;
  constructor(private http: HttpClient) { }
  checkLogin(userData: LoginTemplate): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, userData, {
      withCredentials: true,
    }).pipe(
      tap((item) => {
        localStorage.setItem("token",item.token);
        localStorage.setItem("userId", item.user.id);
      })
    );
  }


  
}

