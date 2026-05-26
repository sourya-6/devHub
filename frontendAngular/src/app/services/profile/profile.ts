import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProfileUpdate {
  bio?: string;
  skills?: string[];
  links?: { github?: string; linkedin?: string; website?: string };
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly baseUrl = environment.backendUrl;
  constructor(private http: HttpClient) {}

  updateProfile(payload: ProfileUpdate): Observable<any> {
    return this.http.patch(`${this.baseUrl}/auth/profile`, payload, { withCredentials: true });
  }

  uploadAvatar(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('image', file);
    return this.http.patch(`${this.baseUrl}/auth/avatar`, fd, { withCredentials: true });
  }
}
