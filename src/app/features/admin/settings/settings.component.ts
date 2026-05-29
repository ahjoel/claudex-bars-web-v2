import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { SettingsService } from '../../../core/services/settings.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.component.html'
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
