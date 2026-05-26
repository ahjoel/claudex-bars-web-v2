import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-impayes-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-exclamation-triangle me-2 text-danger"></i>Factures impayées</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Statistiques</li>
            <li class="breadcrumb-item active">Impayées</li>
          </ol>
        </nav>
      </div>
      <button class="btn btn-outline-primary" (click)="loadStats()">
        <i class="fas fa-sync me-2"></i>Actualiser
      </button>
    </div>

    <!-- Filtres zone -->
    <div class="d-flex gap-2 mb-4">
      <button class="btn btn-sm px-4" [class.btn-secondary]="activeZone === ''" [class.btn-outline-secondary]="activeZone !== ''"
        (click)="setZone('')">
        <i class="fas fa-list me-1"></i>Toutes zones
      </button>
      <button class="btn btn-sm px-4" [class.btn-primary]="activeZone === 'R1'" [class.btn-outline-primary]="activeZone !== 'R1'"
        (click)="setZone('R1')">
        <i class="fas fa-warehouse me-1"></i>Zone R1
      </button>
      <button class="btn btn-sm px-4" [class.btn-info]="activeZone === 'RC'" [class.btn-outline-info]="activeZone !== 'RC'"
        (click)="setZone('RC')">
        <i class="fas fa-boxes me-1"></i>Zone RC
      </button>
    </div>

    <!-- KPIs -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#dc3545">
          <div class="stat-number text-danger">{{ filteredStats.length }}</div>
          <div class="stat-label">Factures impayées{{ activeZone ? ' (' + activeZone + ')' : '' }}</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#f59e0b">
          <div class="stat-number text-warning" style="font-size:1rem">{{ totalImpaye | number:'1.0-0' }} FCFA</div>
          <div class="stat-label">Montant total impayé</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#6366f1">
          <div class="stat-number" style="color:#6366f1">{{ r1Count }} / {{ rcCount }}</div>
          <div class="stat-label">Impayées R1 / RC</div>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card-custom">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="fas fa-list me-2"></i>Liste des factures impayées
          <span class="badge bg-danger ms-2">{{ filteredStats.length }}</span>
        </span>
        <button class="btn btn-sm btn-outline-danger" (click)="downloadPdf()" *ngIf="filteredStats.length" [disabled]="loading">
          <i class="fas fa-file-pdf me-1"></i>Télécharger PDF
        </button>
      </div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="pagedStats"
            [columns]="columns"
            [actions]="[]"
            [loading]="loading"
            [totalRecords]="filteredStats.length"
            [pageSize]="pageSize"
            [currentPage]="currentPage"
            (pageChange)="onPageChange($event)"
          ></app-datatable>
        </div>
        <div class="p-3 text-center text-muted small" *ngIf="!loading && !filteredStats.length">
          <i class="fas fa-check-circle text-success me-2"></i>Aucune facture impayée{{ activeZone ? ' pour la zone ' + activeZone : '' }}.
        </div>
      </div>
    </div>
  `
})
export class ImpayesStatComponent implements OnInit {
  allStats: any[] = [];
  filteredStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  activeZone = '';
  totalImpaye = 0;
  r1Count = 0;
  rcCount = 0;
  pageSize = 10;
  currentPage = 0;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '110px' },
    { field: 'client', header: 'Client', sortable: true },
    { field: 'stock', header: 'Zone', align: 'center',
      format: v => {
        if (!v) return '-';
        const zones = String(v).split('/');
        return zones.map(z => `<span class="badge ${z.trim() === 'R1' ? 'bg-primary' : 'bg-info'} me-1">${z.trim()}</span>`).join('');
      }},
    { field: 'nbproduit', header: 'Nb produits', align: 'center' },
    { field: 'totalfacture', header: 'Montant HT', align: 'right',
      format: v => `<strong class="text-danger">${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'createdAt', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  constructor(private factureService: FactureService, private pdf: PdfService) {}

  ngOnInit(): void { this.loadStats(); }

  loadStats(): void {
    this.loading = true;
    this.factureService.list(0, 9999).subscribe({
      next: (res: any) => {
        const all: any[] = res?.data?.data || [];
        this.allStats = all.filter(f => f.statut === 'impayée');
        this.r1Count = this.allStats.filter(f => String(f.stock ?? '').includes('R1')).length;
        this.rcCount = this.allStats.filter(f => String(f.stock ?? '').includes('RC')).length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setZone(zone: string): void {
    this.activeZone = zone;
    this.currentPage = 0;
    this.applyFilter();
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.applyPage();
  }

  private applyFilter(): void {
    this.filteredStats = this.activeZone
      ? this.allStats.filter(f => String(f.stock ?? '').includes(this.activeZone))
      : this.allStats;
    this.totalImpaye = this.filteredStats.reduce((acc, f) => acc + Number(f.totalfacture ?? 0), 0);
    this.currentPage = 0;
    this.applyPage();
  }

  private applyPage(): void {
    const start = this.currentPage * this.pageSize;
    this.pagedStats = this.filteredStats.slice(start, start + this.pageSize);
  }

  downloadPdf(): void {
    const zone = this.activeZone ? `Zone ${this.activeZone}` : 'Toutes zones';
    const cols = [
      { header: 'Code', width: '70' },
      { header: 'Client', width: '*' },
      { header: 'Zone', width: '50' },
      { header: 'Nb produits', width: '60' },
      { header: 'Montant HT', width: '100' },
      { header: 'Date', width: '65' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const rows = this.filteredStats.map(r => [
      r.code || '-',
      r.client || '-',
      r.stock || '-',
      Number(r.nbproduit ?? 0),
      fmt(r.totalfacture ?? 0),
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '-'
    ]);
    this.pdf.generateStatPdf('Factures impayées', zone, cols, rows, `impayes-${this.activeZone || 'all'}`);
  }
}
