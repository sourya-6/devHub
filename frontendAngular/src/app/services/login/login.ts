import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { LoginResponse, User } from './user';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Login {
  status: boolean = false;
  constructor(private http: HttpClient) { }
  checkLogin(userData: LoginTemplate): Observable<LoginResponse> {
    const res:Observable<LoginResponse> = this.http.post<LoginResponse>("http://localhost:3000/auth/login", userData)
    // localStorage.setItem("token",)
    res.subscribe((item)=>{
      localStorage.setItem("token",item.token);
      localStorage.setItem("userId", item.user._id);
    })
    return res;
  }


  
}


