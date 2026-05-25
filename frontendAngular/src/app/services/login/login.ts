import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse, User } from './user';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Login {
  status: boolean = false;
  private readonly baseUrl = environment.backendUrl;
  constructor(private http: HttpClient) { }
  checkLogin(userData: LoginTemplate): Observable<LoginResponse> {
    const res:Observable<LoginResponse> = this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, userData)
    // localStorage.setItem("token",)
    res.subscribe((item)=>{
      localStorage.setItem("token",item.token);
      localStorage.setItem("userId", item.user._id);
    })
    return res;
  }


  
}


