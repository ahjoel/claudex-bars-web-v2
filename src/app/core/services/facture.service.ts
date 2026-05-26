import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Facture, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class FactureService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 20, zone?: string, dateDebut?: string, dateFin?: string): Observable<ApiResponse<any>> {
    const body: any = { page: page + 1, length: size };
    if (zone) body.stock = zone;
    if (dateDebut) body.date_debut = dateDebut;
    if (dateFin) body.date_fin = dateFin;
    return this.api.post('factures/all', body);
  }

  find(id: number): Observable<ApiResponse<Facture>> {
    return this.api.post('factures/find', { id });
  }

  detail(code: string): Observable<ApiResponse<any>> {
    return this.api.post('factures/detail', { code });
  }

  create(data: { code: string; client_id: number; tax?: number }): Observable<ApiResponse<Facture>> {
    return this.api.post('factures/add', data);
  }

  addLigne(data: { productId: number; facture_id: number; stock: string; quantity: number }): Observable<ApiResponse<any>> {
    return this.api.post('factures/add/ligne', data);
  }

  addReglement(data: { facture_id: number; total: number }): Observable<ApiResponse<any>> {
    return this.api.post('factures/reglement', data);
  }

  update(data: Partial<Facture> & { id: number }): Observable<ApiResponse<Facture>> {
    return this.api.post('factures/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('factures/delete', { id });
  }

  countImpayees(): Observable<ApiResponse<any>> {
    return this.api.post('factures/impayee/count', {});
  }

  statParProducteur(stock: string, data: { date_debut: string; date_fin: string }): Observable<ApiResponse<any>> {
    return this.api.post(`factures/stat/producteur/${stock}`, data);
  }

  statGeneral(stock: string, data: { date_debut: string; date_fin: string }): Observable<ApiResponse<any>> {
    return this.api.post(`factures/stat/stock/general/${stock}`, data);
  }

  statArchivage(stock: string, data: { date_debut: string; date_fin: string }): Observable<ApiResponse<any>> {
    return this.api.post(`factures/stat/archivage/${stock}`, data);
  }
}
