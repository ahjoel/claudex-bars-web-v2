import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-ventes-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-chart-line me-2 text-primary"></i>Statistiques des ventes</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Statistiques</li>
            <li class="breadcrumb-item active">Ventes</li>
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
      <div class="col-md-3">
        <div class="stat-card" style="border-left-color:#0d6efd">
          <div class="stat-number text-primary">{{ allStats.length }}</div>
          <div class="stat-label">Produits</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card" style="border-left-color:#198754">
          <div class="stat-number text-success">{{ totalEntrees }}</div>
          <div class="stat-label">Total entrées</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card" style="border-left-color:#dc3545">
          <div class="stat-number text-danger">{{ totalVendus }}</div>
          <div class="stat-label">Total vendus</div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="stat-card" [style.border-left-color]="totalRestant <= 0 ? '#dc3545' : '#f59e0b'">
          <div class="stat-number" [class.text-danger]="totalRestant <= 0" [class.text-warning]="totalRestant > 0">{{ totalRestant }}</div>
          <div class="stat-label">Stock restant total</div>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card-custom" *ngIf="searched">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="fas fa-list me-2"></i>Mouvement des stocks — Zone {{ filterForm.get('stock')?.value }}
          <span class="badge bg-secondary ms-2">{{ allStats.length }} produit(s)</span>
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
          <i class="fas fa-chart-line me-2"></i>Aucune vente sur cette période.
        </div>
      </div>
    </div>
  `
})
export class VentesStatComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  totalEntrees = 0;
  totalVendus = 0;
  totalRestant = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'produit', header: 'Produit', sortable: true },
    { field: 'model', header: 'Modèle' },
    { field: 'fournisseur', header: 'Fournisseur' },
    { field: 'qte_stock', header: 'Stock initial', align: 'center',
      format: v => `${Number(v ?? 0).toLocaleString('fr-FR')}` },
    { field: 'qte_stock_entree', header: 'Entrées', align: 'center',
      format: v => `<span class="text-success fw-bold">+${Number(v ?? 0).toLocaleString('fr-FR')}</span>` },
    { field: 'qte_stock_vendu', header: 'Vendus', align: 'center',
      format: v => `<span class="text-danger fw-bold">-${Number(v ?? 0).toLocaleString('fr-FR')}</span>` },
    { field: 'qte_stock_restant', header: 'Stock restant', align: 'center',
      format: (v, row: any) => {
        const val = Number(v ?? 0);
        const seuil = Number(row?.seuil ?? 0);
        const cls = val <= 0 ? 'text-danger' : (seuil > 0 && val <= seuil ? 'text-warning' : 'text-success');
        return `<strong class="${cls}">${val.toLocaleString('fr-FR')}</strong>`;
      }},
    { field: 'seuil', header: 'Seuil min', align: 'center',
      format: v => `<span class="text-muted">${Number(v ?? 0).toLocaleString('fr-FR')}</span>` }
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
    this.factureService.statGeneral(stock, { date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.totalEntrees = this.allStats.reduce((acc, r) => acc + Number(r.qte_stock_entree ?? 0), 0);
        this.totalVendus = this.allStats.reduce((acc, r) => acc + Number(r.qte_stock_vendu ?? 0), 0);
        this.totalRestant = this.allStats.reduce((acc, r) => acc + Number(r.qte_stock_restant ?? 0), 0);
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
      { header: 'Produit', width: '*' },
      { header: 'Modèle', width: '80' },
      { header: 'Fournisseur', width: '80' },
      { header: 'Stk initial', width: '55' },
      { header: 'Entrées', width: '50' },
      { header: 'Vendus', width: '50' },
      { header: 'Restant', width: '50' },
      { header: 'Seuil', width: '45' }
    ];
    const rows = this.allStats.map(r => [
      r.produit || '-',
      r.model || '-',
      r.fournisseur || '-',
      Number(r.qte_stock ?? 0),
      Number(r.qte_stock_entree ?? 0),
      Number(r.qte_stock_vendu ?? 0),
      Number(r.qte_stock_restant ?? 0),
      Number(r.seuil ?? 0)
    ]);
    this.pdf.generateStatPdf('Statistiques des ventes', range, cols, rows, `ventes-${stock}-${date_debut}`);
  }
}
