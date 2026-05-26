import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Mouvement, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class MouvementService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 20, stock = 'R1'): Observable<ApiResponse<any>> {
    return this.api.post('mouvements/all', { page: page + 1, length: size, stock });
  }

  find(id: number): Observable<ApiResponse<Mouvement>> {
    return this.api.post('mouvements/find', { id });
  }

  create(data: Partial<Mouvement>): Observable<ApiResponse<Mouvement>> {
    return this.api.post('mouvements/add', data);
  }

  update(data: Partial<Mouvement> & { id: number }): Observable<ApiResponse<Mouvement>> {
    return this.api.post('mouvements/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('mouvements/delete', { id });
  }

  stockDispo(stock?: string, page = 1, size = 999): Observable<ApiResponse<any>> {
    const body: any = { page, length: size };
    if (stock) body.stock = stock;
    return this.api.post('mouvements/stock/dispo', body);
  }

  stockDispoProduit(produitId: number): Observable<ApiResponse<any>> {
    return this.api.post('mouvements/stock/dispo/produit', { produitId });
  }

  statReglementMois(data: { date_debut: string; date_fin: string }): Observable<ApiResponse<any>> {
    return this.api.post('mouvements/stat/reglement/mois', data);
  }
}
