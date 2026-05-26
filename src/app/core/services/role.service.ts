import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RoleScreen { path: string; label: string; }
export interface Role {
  id: number;
  name: string;
  description?: string;
  status?: string;
  screens?: RoleScreen[];
}

@Injectable({ providedIn: 'root' })
export class RoleService {
  private api = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  list(): Observable<any> {
    return this.http.post(`${this.api}/all`, {});
  }

  getScreens(roleId: number): Observable<any> {
    return this.http.post(`${this.api}/screens/get`, { roleId });
  }

  assignScreens(roleId: number, screens: RoleScreen[]): Observable<any> {
    return this.http.post(`${this.api}/screens/assign`, { roleId, screens });
  }
}
