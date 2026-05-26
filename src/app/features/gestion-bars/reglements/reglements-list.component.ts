import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ReglementService } from '../../../core/services/reglement.service';
import { FactureService } from '../../../core/services/facture.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AuthService } from '../../../core/services/auth.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Reglement } from '../../../core/models/entities.model';
import { CfaPipe } from '../../../shared/pipes/cfa.pipe';

@Component({
  selector: 'app-reglements-list',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTableComponent, CfaPipe],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-money-bill-wave me-2 text-primary"></i>Règlements</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Gestion Bars</li>
            <li class="breadcrumb-item active">Règlements{{ activeZone ? ' — Zone ' + activeZone : '' }}</li>
          </ol>
        </nav>
      </div>
    </div>

    <!-- Zone tabs -->
    <div class="d-flex gap-2 mb-4">
      <button class="btn btn-sm px-4" [class.btn-primary]="activeZone === ''" [class.btn-outline-secondary]="activeZone !== ''"
        [disabled]="activeZone === 'R1' || activeZone === 'RC'"
        [style.opacity]="(activeZone === 'R1' || activeZone === 'RC') ? '0.4' : '1'"
        [style.cursor]="(activeZone === 'R1' || activeZone === 'RC') ? 'not-allowed' : 'pointer'"
        (click)="filterByZone('')">
        <i class="fas fa-list me-1"></i>Toutes
      </button>
      <button class="btn btn-sm px-4" [class.btn-primary]="activeZone === 'R1'" [class.btn-outline-primary]="activeZone !== 'R1'"
        [disabled]="activeZone === 'RC'"
        [style.opacity]="activeZone === 'RC' ? '0.4' : '1'"
        [style.cursor]="activeZone === 'RC' ? 'not-allowed' : 'pointer'"
        (click)="filterByZone('R1')">
        <i class="fas fa-warehouse me-1"></i>Zone R1
      </button>
      <button class="btn btn-sm px-4" [class.btn-info]="activeZone === 'RC'" [class.btn-outline-info]="activeZone !== 'RC'"
        [disabled]="activeZone === 'R1'"
        [style.opacity]="activeZone === 'R1' ? '0.4' : '1'"
        [style.cursor]="activeZone === 'R1' ? 'not-allowed' : 'pointer'"
        (click)="filterByZone('RC')">
        <i class="fas fa-warehouse me-1"></i>Zone RC
      </button>
    </div>

    <!-- Filtre date -->
    <div class="card-custom mb-4">
      <div class="card-body py-2">
        <div class="d-flex align-items-end gap-3 flex-wrap">
          <div>
            <label class="form-label mb-1 small fw-semibold">Date début</label>
            <input type="date" class="form-control form-control-sm" [(ngModel)]="dateDebut" />
          </div>
          <div>
            <label class="form-label mb-1 small fw-semibold">Date fin</label>
            <input type="date" class="form-control form-control-sm" [(ngModel)]="dateFin" />
          </div>
          <button class="btn btn-sm btn-primary" (click)="searchByDate()" [disabled]="!dateDebut || !dateFin">
            <i class="fas fa-search me-1"></i>Rechercher
          </button>
          <button class="btn btn-sm btn-outline-secondary" (click)="resetDateFilter()" *ngIf="dateDebut || dateFin">
            <i class="fas fa-times me-1"></i>Réinitialiser
          </button>
        </div>
      </div>
    </div>

    <!-- Totaux -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color: #198754;">
          <div class="stat-number text-success">{{ totalRecu | cfa }}</div>
          <div class="stat-label">Total reçu</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color: #0d6efd;">
          <div class="stat-number text-primary">{{ totalPayer | cfa }}</div>
          <div class="stat-label">Total à payer</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" [style.border-left-color]="(totalPayer - totalRecu) > 0 ? '#dc3545' : '#198754'">
          <div class="stat-number" [class.text-danger]="(totalPayer - totalRecu) > 0" [class.text-success]="(totalPayer - totalRecu) <= 0">
            {{ (totalPayer - totalRecu) | cfa }}
          </div>
          <div class="stat-label">Reste à payer</div>
        </div>
      </div>
    </div>

    <div class="card-custom">
      <div class="card-header"><i class="fas fa-list me-2"></i>Historique des règlements ({{ totalRecords }})</div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="reglements"
            [columns]="columns"
            [actions]="actions"
            [loading]="loading"
            [totalRecords]="totalRecords"
            [pageSize]="pageSize"
            [currentPage]="currentPage"
            (rowAction)="onAction($event)"
            (pageChange)="onPageChange($event)"
          ></app-datatable>
        </div>
      </div>
    </div>
  `
})
export class ReglementsListComponent implements OnInit, OnDestroy {
  private zoneSub?: Subscription;
  reglements: Reglement[] = [];
  loading = false;
  totalRecords = 0;
  pageSize = 10;
  currentPage = 0;
  totalRecu = 0;
  totalPayer = 0;
  dateDebut = '';
  dateFin = '';

  columns: DataTableColumn[] = [
    { field: 'codeFacture', header: 'Facture', format: v => v || '-' },
    { field: 'client', header: 'Client', format: v => v || '-' },
    { field: 'mtrecu', header: 'Montant reçu', align: 'right', format: v => `<strong class="text-success">${Number(v||0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'mtpayer', header: 'Montant à payer', align: 'right', format: v => `${Number(v||0).toLocaleString('fr-FR')} FCFA` },
    { field: 'createdAt', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  get actions(): DataTableAction[] {
    const base: DataTableAction[] = [
      { label: 'Imprimer reçu', icon: 'fas fa-print', color: 'blue', action: 'print' }
    ];
    if (this.authService.isSuperAdmin()) {
      base.push({ label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' });
    }
    return base;
  }

  activeZone = '';

  constructor(
    private reglementService: ReglementService,
    private factureService: FactureService,
    private snackbar: SnackbarService,
    private route: ActivatedRoute,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.zoneSub = this.route.queryParamMap.subscribe(params => {
      this.activeZone = params.get('zone') || '';
      this.currentPage = 0;
      this.loadData();
    });
  }

  ngOnDestroy(): void { this.zoneSub?.unsubscribe(); }

  filterByZone(zone: string): void {
    this.activeZone = zone;
    this.currentPage = 0;
    this.loadData();
  }

  searchByDate(): void { this.currentPage = 0; this.loadData(); }

  resetDateFilter(): void { this.dateDebut = ''; this.dateFin = ''; this.currentPage = 0; this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.reglementService.list(this.currentPage, this.pageSize, this.activeZone || undefined, this.dateDebut || undefined, this.dateFin || undefined).subscribe({
      next: (res: any) => {
        this.reglements = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.reglements.length;
        this.totalRecu = this.reglements.reduce((acc, r) => acc + (r.mtrecu ?? 0), 0);
        this.totalPayer = this.reglements.reduce((acc, r) => acc + (r.mtpayer ?? 0), 0);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(e: { page: number; size: number }): void { this.currentPage = e.page; this.pageSize = e.size; this.loadData(); }

  onAction(e: { action: string; row: Reglement }): void {
    if (e.action === 'print') {
      this.printReglement(e.row);
    } else if (e.action === 'delete' && confirm('Supprimer ce règlement ?')) {
      this.reglementService.delete(e.row.id).subscribe({
        next: () => { this.snackbar.success('Règlement supprimé'); this.loadData(); }
      });
    }
  }

  printReglement(r: Reglement): void {
    const ra = r as any;
    const codeFacture = ra.codeFacture || ra.code || '-';
    this.factureService.detail(codeFacture).subscribe({
      next: (res: any) => {
        const rows: any[] = res?.data?.facturesDetail || [];
        this.openReglementReceipt(r, rows);
      },
      error: () => this.openReglementReceipt(r, [])
    });
  }

  private openReglementReceipt(r: Reglement, lignes: any[]): void {
    const ra = r as any;
    const date = r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '-';
    const fmt = (n: number) => Number(n).toLocaleString('fr-FR');
    const client      = ra.client || '-';
    const codeFacture = ra.codeFacture || ra.code || '-';
    const auteur      = [ra.firstname, ra.lastname].filter(Boolean).join(' ') || '-';
    const mtrecu      = Number(r.mtrecu ?? ra.totalFacture ?? 0);
    const numRecu     = `REC-${String(r.id).padStart(6, '0')}`;

    const produitRows = lignes.map(m =>
      `<tr><td>${m.qte}</td><td>${m.produit || '-'}</td><td class="right">${fmt(Number(m.pv ?? 0))}</td></tr>`
    ).join('');

    const produitsTable = lignes.length ? `
  <div class="sep"></div>
  <table>
    <thead><tr><th style="width:28px">Qté</th><th>Désignation</th><th class="right" style="width:65px">PV (F)</th></tr></thead>
    <tbody>
      ${produitRows}
    </tbody>
  </table>` : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu ${numRecu}</title>
<style>
  *{font-size:11px;font-family:'Courier New',monospace;margin:0;padding:0}
  body{width:300px;margin:0 auto;padding:10px}
  .centered{text-align:center}
  .sep{border-top:1px dashed #000;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  th,td{padding:2px 4px;vertical-align:top}
  th{border-top:1px solid #000;border-bottom:1px solid #000}
  .right{text-align:right}
  h2{font-size:13px;font-weight:bold;margin-bottom:2px}
  .title{font-size:12px;font-weight:bold;text-align:center;margin:6px 0}
  .row{display:flex;justify-content:space-between;margin:3px 0}
  .bold{font-weight:bold}
  @media print{body{width:auto}}
</style></head><body>
  <div class="centered">
    <h2>CLAUDEX-BAR</h2>
    <p>AGOE AMANDETA EPP Amandeta<br>Face Antenne Togocom<br>Tel : (+228) 92 80 26 38</p>
  </div>
  <div class="sep"></div>
  <p class="title">REÇU DE PAIEMENT</p>
  <div class="sep"></div>
  <div class="row"><span>N° Reçu :</span><span class="bold">${numRecu}</span></div>
  <div class="row"><span>Facture :</span><span class="bold">${codeFacture}</span></div>
  <div class="row"><span>Client :</span><span>${client}</span></div>
  <div class="row"><span>Date :</span><span>${date}</span></div>
  ${auteur !== '-' ? `<div class="row"><span>Encaissé par :</span><span>${auteur}</span></div>` : ''}
  ${produitsTable}
  <div class="sep"></div>
  <div class="row"><span class="bold">Montant réglé :</span><span class="bold">${fmt(mtrecu)} F CFA</span></div>
  <div class="sep"></div>
  <p class="centered">Merci pour votre règlement !</p>
</body></html>`;
    const w = window.open('', '_blank', 'width=350,height=550');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }
}
