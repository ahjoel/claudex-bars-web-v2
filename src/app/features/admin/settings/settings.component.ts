import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { SettingsService } from '../../../core/services/settings.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-cog me-2 text-primary"></i>Paramètres</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Administration</li>
            <li class="breadcrumb-item active">Paramètres</li>
          </ol>
        </nav>
      </div>
    </div>

    <div class="row g-4">
      <div class="col-md-6">
        <div class="card-custom">
          <div class="card-header"><i class="fas fa-server me-2"></i>Informations système</div>
          <div class="card-body">
            <table class="table table-sm mb-0">
              <tbody>
                <tr>
                  <td class="text-muted">Application</td>
                  <td><strong>Claudex Bars v2</strong></td>
                </tr>
                <tr>
                  <td class="text-muted">Version</td>
                  <td><span class="badge bg-primary">2.0.0</span></td>
                </tr>
                <tr>
                  <td class="text-muted">Environnement</td>
                  <td><span class="badge" [class]="env.production ? 'bg-success' : 'bg-warning text-dark'">{{ env.production ? 'Production' : 'Développement' }}</span></td>
                </tr>
                <tr>
                  <td class="text-muted">API Backend</td>
                  <td><code>{{ env.backendUrl }}</code></td>
                </tr>
                <tr>
                  <td class="text-muted">Année</td>
                  <td>2026</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card-custom">
          <div class="card-header"><i class="fas fa-database me-2"></i>Zones de stock</div>
          <div class="card-body">
            <div class="d-flex gap-3 mb-3">
              <div class="p-3 border rounded flex-fill text-center">
                <div class="fs-4 fw-bold text-primary">R1</div>
                <div class="text-muted small">Zone principale</div>
              </div>
              <div class="p-3 border rounded flex-fill text-center">
                <div class="fs-4 fw-bold text-success">RC</div>
                <div class="text-muted small">Zone secondaire</div>
              </div>
            </div>
            <p class="text-muted small mb-0">
              <i class="fas fa-info-circle me-1"></i>
              Les zones de stock R1 et RC permettent de séparer les inventaires par emplacement physique.
            </p>
          </div>
        </div>
      </div>

      <div class="col-md-6">
        <div class="card-custom">
          <div class="card-header"><i class="fas fa-database me-2"></i>Sauvegarde de la base de données</div>
          <div class="card-body">
            <p class="text-muted small mb-3">
              <i class="fas fa-info-circle me-1"></i>
              Génère un fichier <code>.sql</code> complet de la base de données Claudex Bars. Le fichier sera téléchargé automatiquement.
            </p>
            <button class="btn btn-outline-primary w-100" (click)="exportDatabase()" [disabled]="exporting">
              <span *ngIf="exporting" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!exporting" class="fas fa-download me-2"></i>
              {{ exporting ? 'Export en cours...' : 'Télécharger la sauvegarde SQL' }}
            </button>
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card-custom">
          <div class="card-header"><i class="fas fa-map me-2"></i>Navigation disponible</div>
          <div class="card-body">
            <div class="row g-2">
              <div class="col-md-4 col-lg-3" *ngFor="let route of routes">
                <div class="p-2 bg-light rounded d-flex align-items-center gap-2">
                  <i [class]="route.icon + ' text-primary small'"></i>
                  <span class="small">{{ route.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  env = environment;
  exporting = false;

  constructor(
    private settingsService: SettingsService,
    private snackbar: SnackbarService
  ) {}

  exportDatabase(): void {
    this.exporting = true;
    this.settingsService.exportDatabase().subscribe({
      next: (blob) => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}m`;
        const filename = `claudex_bars_backup_${ts}.sql`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.exporting = false;
        this.snackbar.success('Sauvegarde téléchargée avec succès');
      },
      error: () => {
        this.exporting = false;
        this.snackbar.error('Échec de l\'export de la base de données');
      }
    });
  }

  routes = [
    { icon: 'fas fa-tachometer-alt', label: '/dashboard' },
    { icon: 'fas fa-users', label: '/gestion-bars/clients' },
    { icon: 'fas fa-box', label: '/gestion-bars/produits' },
    { icon: 'fas fa-truck', label: '/gestion-bars/fournisseurs' },
    { icon: 'fas fa-file-invoice', label: '/gestion-bars/factures' },
    { icon: 'fas fa-money-bill-wave', label: '/gestion-bars/reglements' },
    { icon: 'fas fa-tags', label: '/gestion-bars/modeles' },
    { icon: 'fas fa-warehouse', label: '/gestion-stock' },
    { icon: 'fas fa-cash-register', label: '/facturation' },
    { icon: 'fas fa-chart-bar', label: '/statistiques/factures' },
    { icon: 'fas fa-chart-line', label: '/statistiques/ventes' },
    { icon: 'fas fa-archive', label: '/statistiques/archivees' },
    { icon: 'fas fa-exclamation', label: '/statistiques/impayes' },
    { icon: 'fas fa-boxes', label: '/statistiques/stock' },
    { icon: 'fas fa-coins', label: '/statistiques/caisse-mensuelle' },
    { icon: 'fas fa-user-cog', label: '/admin/users' },
    { icon: 'fas fa-cog', label: '/admin/settings' }
  ];
}
