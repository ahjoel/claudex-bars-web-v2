import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AppUser, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 50): Observable<ApiResponse<any>> {
    return this.api.post('users/all', { page: page + 1, length: size });
  }

  find(id: number): Observable<ApiResponse<AppUser>> {
    return this.api.post('users/find', { id });
  }

  create(data: Partial<AppUser>): Observable<ApiResponse<AppUser>> {
    return this.api.post('users/add', data);
  }

  update(data: Partial<AppUser> & { id: number }): Observable<ApiResponse<AppUser>> {
    return this.api.post('users/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('users/delete', { id });
  }
}
