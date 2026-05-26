import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MouvementService } from '../../../core/services/mouvement.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-caisse-mensuelle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-coins me-2 text-primary"></i>Caisse mensuelle</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Statistiques</li>
            <li class="breadcrumb-item active">Caisse mensuelle</li>
          </ol>
        </nav>
      </div>
    </div>

    <!-- Filtres -->
    <div class="card-custom mb-4">
      <div class="card-header"><i class="fas fa-calendar-alt me-2"></i>Période</div>
      <div class="card-body">
        <form [formGroup]="filterForm" (ngSubmit)="loadStats()" class="row g-3 align-items-end">
          <div class="col-md-4">
            <label class="form-label">Date début *</label>
            <input type="date" class="form-control" formControlName="date_debut" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Date fin *</label>
            <input type="date" class="form-control" formControlName="date_fin" />
          </div>
          <div class="col-md-4">
            <button type="submit" class="btn btn-primary w-100" [disabled]="loading">
              <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!loading" class="fas fa-search me-2"></i>
              {{ loading ? 'Chargement...' : 'Afficher' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- KPIs -->
    <div class="row g-3 mb-4" *ngIf="allStats.length">
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#198754">
          <div class="stat-number text-success" style="font-size:1rem">{{ totalEncaisse | number:'1.0-0' }} FCFA</div>
          <div class="stat-label">Total encaissé</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#0d6efd">
          <div class="stat-number text-primary">{{ allStats.length }}</div>
          <div class="stat-label">Nombre de règlements</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color:#6366f1">
          <div class="stat-number" style="color:#6366f1; font-size:1rem">{{ moyenneParReglement | number:'1.0-0' }} FCFA</div>
          <div class="stat-label">Montant moyen</div>
        </div>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card-custom" *ngIf="searched">
      <div class="card-header d-flex justify-content-between align-items-center">
        <span>
          <i class="fas fa-list me-2"></i>Détail des règlements
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
        <div class="p-3 text-center text-muted small" *ngIf="!loading && !allStats.length">
          <i class="fas fa-coins me-2"></i>Aucun règlement enregistré sur cette période.
        </div>
      </div>
    </div>
  `
})
export class CaisseMensuelleComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  totalEncaisse = 0;
  moyenneParReglement = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code facture', format: v => v || '-' },
    { field: 'client', header: 'Client', sortable: true, format: v => v || '-' },
    { field: 'mtrecu', header: 'Montant encaissé', align: 'right',
      format: v => `<strong class="text-success">${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'mtpayer', header: 'Montant à payer', align: 'right',
      format: v => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA` },
    { field: 'createdAt', header: 'Date règlement',
      format: v => v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }
  ];

  constructor(private mouvementService: MouvementService, private fb: FormBuilder, private pdf: PdfService) {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    this.filterForm = this.fb.group({
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
    const { date_debut, date_fin } = this.filterForm.value;
    this.mouvementService.statReglementMois({ date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.totalEncaisse = this.allStats.reduce((acc, r) => acc + Number(r.mtrecu ?? r.total ?? r.montant ?? 0), 0);
        this.moyenneParReglement = this.allStats.length ? this.totalEncaisse / this.allStats.length : 0;
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
    const { date_debut, date_fin } = this.filterForm.value;
    const range = `Période : ${new Date(date_debut).toLocaleDateString('fr-FR')} → ${new Date(date_fin).toLocaleDateString('fr-FR')}`;
    const cols = [
      { header: 'Code facture', width: '80' },
      { header: 'Client', width: '*' },
      { header: 'Encaissé', width: '100' },
      { header: 'À payer', width: '100' },
      { header: 'Date', width: '90' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const rows = this.allStats.map(r => [
      r.code || '-',
      r.client || '-',
      fmt(r.mtrecu ?? 0),
      fmt(r.mtpayer ?? 0),
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '-'
    ]);
    this.pdf.generateStatPdf('Caisse mensuelle — Règlements', range, cols, rows, `caisse-${date_debut}-${date_fin}`);
  }
}
