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
  templateUrl: './reglements-list.component.html'
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
  readonly today = new Date().toISOString().split('T')[0];
  dateDebut = this.today;
  dateFin = this.today;

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
    if (this.authService.isAdmin()) {
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

  resetDateFilter(): void { this.dateDebut = this.today; this.dateFin = this.today; this.currentPage = 0; this.loadData(); }

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
  *{font-size:13px;font-family:'Courier New',monospace;margin:0;padding:0;color:#000;font-weight:600}
  body{width:300px;margin:0 auto;padding:10px;background:#fff}
  .centered{text-align:center}
  .sep{border-top:2px dashed #000;margin:6px 0}
  table{width:100%;border-collapse:collapse}
  th,td{padding:3px 4px;vertical-align:top}
  th{border-top:2px solid #000;border-bottom:2px solid #000;font-weight:800;font-size:13px}
  .right{text-align:right}
  h2{font-size:15px;font-weight:900;margin-bottom:2px;letter-spacing:1px}
  p{font-size:12px;font-weight:600;line-height:1.5}
  .title{font-size:14px;font-weight:900;text-align:center;margin:6px 0;letter-spacing:1px}
  .row{display:flex;justify-content:space-between;margin:3px 0;font-size:13px}
  .bold{font-weight:900}
  @media print{
    *{color:#000!important;background:transparent!important;font-weight:600!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    h2{font-weight:900!important;font-size:15px!important}
    .title{font-weight:900!important;font-size:14px!important}
    .bold{font-weight:900!important}
    th{font-weight:800!important}
    body{width:auto}
  }
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
