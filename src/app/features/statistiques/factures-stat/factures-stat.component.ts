import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-factures-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-chart-bar me-2 text-primary"></i>Statistiques par producteur</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Statistiques</li>
            <li class="breadcrumb-item active">Factures par producteur</li>
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
          <div class="stat-label">Producteurs Zone {{ filterForm.get('stock')?.value }}</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#198754">
          <div class="stat-number text-success">{{ totalQte }}</div>
          <div class="stat-label">Quantité totale vendue</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#f59e0b">
          <div class="stat-number text-warning" style="font-size:1.1rem">{{ totalMontant | number:'1.0-0' }} FCFA</div>
          <div class="stat-label">Montant total vendu</div>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card-custom" *ngIf="searched">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="fas fa-list me-2"></i>Résultats — Zone {{ filterForm.get('stock')?.value }}
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
          <i class="fas fa-chart-bar me-2"></i>Aucune donnée pour cette période.
        </div>
      </div>
    </div>
  `
})
export class FacturesStatComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  totalQte = 0;
  totalMontant = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'producteur', header: 'Producteur', sortable: true },
    { field: 'stock', header: 'Zone', align: 'center',
      format: v => `<span class="badge ${v === 'R1' ? 'bg-primary' : 'bg-info'}">${v}</span>` },
    { field: 'quantite', header: 'Qté vendue', align: 'center',
      format: v => `<strong>${Number(v ?? 0).toLocaleString('fr-FR')}</strong>` },
    { field: 'montant_vendu', header: 'Montant vendu', align: 'right',
      format: v => `<strong class="text-success">${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` }
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
    this.factureService.statParProducteur(stock, { date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.totalQte = this.allStats.reduce((acc, r) => acc + Number(r.quantite ?? 0), 0);
        this.totalMontant = this.allStats.reduce((acc, r) => acc + Number(r.montant_vendu ?? 0), 0);
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
      { header: 'Producteur', width: '*' },
      { header: 'Zone', width: '50' },
      { header: 'Qté vendue', width: '70' },
      { header: 'Montant vendu', width: '100' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const fmtQte = (n: number) => Number(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const rows = this.allStats.map(r => [
      r.producteur || '-',
      r.stock || '-',
      fmtQte(r.quantite ?? 0),
      fmt(r.montant_vendu ?? 0)
    ]);
    this.pdf.generateStatPdf('Statistiques par producteur', range, cols, rows, `stat-producteur-${stock}-${date_debut}`);
  }
}
