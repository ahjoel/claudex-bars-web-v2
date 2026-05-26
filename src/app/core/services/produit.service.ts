import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Produit, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class ProduitService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 20, zone?: string): Observable<ApiResponse<any>> {
    const body: any = { page: page + 1, length: size };
    if (zone) body.stock = zone;
    return this.api.post('produits/all', body);
  }

  find(id: number): Observable<ApiResponse<Produit>> {
    return this.api.post('produits/find', { id });
  }

  create(data: Partial<Produit>): Observable<ApiResponse<Produit>> {
    return this.api.post('produits/add', data);
  }

  update(data: Partial<Produit> & { id: number }): Observable<ApiResponse<Produit>> {
    return this.api.post('produits/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('produits/delete', { id });
  }
}
