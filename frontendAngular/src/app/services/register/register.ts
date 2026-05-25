import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../login/user';

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
  constructor(private http: HttpClient) { }

  registerUser(userData: RegisterTemplate): Observable<RegisterResponse> {
    const res: Observable<RegisterResponse> = this.http.post<RegisterResponse>("http://localhost:3000/auth/register", userData)
    res.subscribe((item) => {
      localStorage.setItem("token", item.token);
      localStorage.setItem("userId", item.user._id);
    })
    return res;
  }
}
