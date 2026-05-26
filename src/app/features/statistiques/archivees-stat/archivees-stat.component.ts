import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-archivees-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-archive me-2 text-primary"></i>Factures archivées</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Statistiques</li>
            <li class="breadcrumb-item active">Archivées</li>
          </ol>
        </nav>
      </div>
    </div>

    <!-- Filtres -->
    <div class="card-custom mb-4">
      <div class="card-header"><i class="fas fa-filter me-2"></i>Filtres</div>
      <div class="card-body">
        <form [formGroup]="filterForm" (ngSubmit)="loadStats()" class="row g-3 align-items-end">
          <div class="col-md-3">
            <label class="form-label">Zone stock</label>
            <div class="d-flex gap-2">
              <button type="button" class="btn w-50 fw-bold"
                [class.btn-primary]="filterForm.get('stock')?.value === 'R1'"
                [class.btn-outline-primary]="filterForm.get('stock')?.value !== 'R1'"
                (click)="filterForm.get('stock')?.setValue('R1')">
                <i class="fas fa-warehouse me-1"></i>R1
              </button>
              <button type="button" class="btn w-50 fw-bold"
                [class.btn-info]="filterForm.get('stock')?.value === 'RC'"
                [class.btn-outline-info]="filterForm.get('stock')?.value !== 'RC'"
                (click)="filterForm.get('stock')?.setValue('RC')">
                <i class="fas fa-boxes me-1"></i>RC
              </button>
            </div>
          </div>
          <div class="col-md-3">
            <label class="form-label">Date début *</label>
            <input type="date" class="form-control" formControlName="date_debut" />
          </div>
          <div class="col-md-3">
            <label class="form-label">Date fin *</label>
            <input type="date" class="form-control" formControlName="date_fin" />
          </div>
          <div class="col-md-3">
            <button type="submit" class="btn btn-primary w-100" [disabled]="loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!loading" class="fas fa-search me-2"></i>
              {{ loading ? 'Recherche...' : 'Rechercher' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- KPIs -->
    <div class="row g-3 mb-4" *ngIf="allStats.length">
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#0d6efd">
          <div class="stat-number text-primary">{{ allStats.length }}</div>
          <div class="stat-label">Total factures</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#198754">
          <div class="stat-number text-success">{{ payees }}</div>
          <div class="stat-label">Payées</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#dc3545">
          <div class="stat-number text-danger">{{ impayees }}</div>
          <div class="stat-label">Impayées</div>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card-custom" *ngIf="searched">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="fas fa-list me-2"></i>Factures archivées — Zone {{ filterForm.get('stock')?.value }}
          <span class="badge bg-secondary ms-2">{{ allStats.length }}</span>
        </span>
        <button class="btn btn-sm btn-outline-danger" (click)="downloadPdf()" *ngIf="allStats.length" [disabled]="loading">
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
            [totalRecords]="allStats.length"
            [pageSize]="pageSize"
            [currentPage]="currentPage"
            (pageChange)="onPageChange($event)"
          ></app-datatable>
        </div>
        <div class="p-3 text-muted text-center small" *ngIf="!loading && !allStats.length">
          <i class="fas fa-archive me-2"></i>Aucune facture archivée sur cette période.
        </div>
      </div>
    </div>
  `
})
export class ArchiveesStatComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  payees = 0;
  impayees = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '110px' },
    { field: 'client', header: 'Client', sortable: true },
    { field: 'date_creation', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' },
    { field: 'stock', header: 'Zone', align: 'center',
      format: v => `<span class="badge ${v === 'R1' ? 'bg-primary' : 'bg-info'}">${v ?? '-'}</span>` },
    { field: 'nbproduit', header: 'Nb produits', align: 'center' },
    { field: 'taxe', header: 'Taxe', align: 'center', format: v => `${v ?? 0} %` },
    { field: 'totalfacture', header: 'Total', align: 'right',
      format: v => `<strong>${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'statut', header: 'Statut', align: 'center',
      format: v => v === 'payée'
        ? `<span class="badge bg-success">Payée</span>`
        : `<span class="badge bg-danger">Impayée</span>` }
  ];

  constructor(private factureService: FactureService, private fb: FormBuilder, private pdf: PdfService) {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    this.filterForm = this.fb.group({
      stock: ['R1', Validators.required],
      date_debut: [firstDay, Validators.required],
      date_fin: [today, Validators.required]
    });
  }

  ngOnInit(): void { this.loadStats(); }

  loadStats(): void {
    if (this.filterForm.invalid) return;
    this.loading = true;
    this.searched = true;
    this.currentPage = 0;
    const { stock, date_debut, date_fin } = this.filterForm.value;
    this.factureService.statArchivage(stock, { date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.payees = this.allStats.filter(r => r.statut === 'payée').length;
        this.impayees = this.allStats.filter(r => r.statut === 'impayée').length;
        this.applyPage();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.applyPage();
  }

  private applyPage(): void {
    const start = this.currentPage * this.pageSize;
    this.pagedStats = this.allStats.slice(start, start + this.pageSize);
  }

  downloadPdf(): void {
    const { stock, date_debut, date_fin } = this.filterForm.value;
    const range = `Période : ${new Date(date_debut).toLocaleDateString('fr-FR')} → ${new Date(date_fin).toLocaleDateString('fr-FR')} — Zone ${stock}`;
    const cols = [
      { header: 'Code', width: '70' },
      { header: 'Client', width: '*' },
      { header: 'Date', width: '65' },
      { header: 'Zone', width: '40' },
      { header: 'Nb produits', width: '60' },
      { header: 'Total', width: '90' },
      { header: 'Statut', width: '55' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const rows = this.allStats.map(r => [
      r.code || '-',
      r.client || '-',
      r.date_creation ? new Date(r.date_creation).toLocaleDateString('fr-FR') : '-',
      r.stock || '-',
      Number(r.nbproduit ?? 0),
      fmt(r.totalfacture ?? 0),
      r.statut || '-'
    ]);
    this.pdf.generateStatPdf('Factures archivées', range, cols, rows, `archivees-${stock}-${date_debut}`);
  }
}
