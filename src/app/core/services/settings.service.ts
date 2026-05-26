import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private api: ApiService) {}

  exportDatabase(): Observable<Blob> {
    return this.api.postBlob('settings/export-database');
  }
}
