import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Fournisseur, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class FournisseurService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 200): Observable<ApiResponse<any>> {
    return this.api.post('fournisseurs/all', { page: page + 1, length: size });
  }

  find(id: number): Observable<ApiResponse<Fournisseur>> {
    return this.api.post('fournisseurs/find', { id });
  }

  create(data: Partial<Fournisseur>): Observable<ApiResponse<Fournisseur>> {
    return this.api.post('fournisseurs/add', data);
  }

  update(data: Partial<Fournisseur> & { id: number }): Observable<ApiResponse<Fournisseur>> {
    return this.api.post('fournisseurs/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('fournisseurs/delete', { id });
  }
}
