import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Reglement, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class ReglementService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 20, zone?: string, dateDebut?: string, dateFin?: string): Observable<ApiResponse<any>> {
    const body: any = { page: page + 1, length: size };
    if (zone) body.stock = zone;
    if (dateDebut) body.date_debut = dateDebut;
    if (dateFin) body.date_fin = dateFin;
    return this.api.post('reglements/all', body);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('reglements/delete', { id });
  }
}
