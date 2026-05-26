import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Client, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class ClientService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 20): Observable<ApiResponse<any>> {
    return this.api.post('clients/all', { page: page + 1, length: size });
  }

  find(id: number): Observable<ApiResponse<Client>> {
    return this.api.post('clients/find', { id });
  }

  create(data: Partial<Client>): Observable<ApiResponse<Client>> {
    return this.api.post('clients/add', data);
  }

  update(data: Partial<Client> & { id: number }): Observable<ApiResponse<Client>> {
    return this.api.post('clients/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('clients/delete', { id });
  }
}
