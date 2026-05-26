import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ModelCategory, ApiResponse } from '../models/entities.model';

@Injectable({ providedIn: 'root' })
export class ModelCategoryService {
  constructor(private api: ApiService) {}

  list(page = 0, size = 200): Observable<ApiResponse<any>> {
    return this.api.post('models/all', { page: page + 1, length: size });
  }

  find(id: number): Observable<ApiResponse<ModelCategory>> {
    return this.api.post('models/find', { id });
  }

  create(data: Partial<ModelCategory>): Observable<ApiResponse<ModelCategory>> {
    return this.api.post('models/add', data);
  }

  update(data: Partial<ModelCategory> & { id: number }): Observable<ApiResponse<ModelCategory>> {
    return this.api.post('models/update', data);
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.api.post('models/delete', { id });
  }
}
