import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AuthService } from '../../../core/services/auth.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Facture } from '../../../core/models/entities.model';
import { CfaPipe } from '../../../shared/pipes/cfa.pipe';

@Component({
  selector: 'app-factures-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DataTableComponent, CfaPipe],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-file-invoice me-2 text-primary"></i>Factures</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Gestion Bars</li>
            <li class="breadcrumb-item active">Factures</li>
          </ol>
        </nav>
      </div>
      <a routerLink="/facturation" class="btn btn-primary">
        <i class="fas fa-plus me-2"></i>Nouvelle facture
      </a>
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

    <!-- Summary cards -->
    <div class="row g-3 mb-4">
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color: #0d6efd;">
          <div class="stat-number text-primary">{{ totalRecords }}</div>
          <div class="stat-label">Total factures{{ activeZone ? ' (' + activeZone + ')' : '' }}</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color: #198754;">
          <div class="stat-number text-success">{{ montantTotal | cfa }}</div>
          <div class="stat-label">Montant total HT</div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="stat-card" style="border-left-color: #dc3545;">
          <div class="stat-number text-danger">{{ impayees }}</div>
          <div class="stat-label">Factures impayées</div>
        </div>
      </div>
    </div>

    <div class="card-custom">
      <div class="card-header"><i class="fas fa-list me-2"></i>Liste des factures ({{ totalRecords }})</div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="factures"
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

    <!-- Detail Modal -->
    <div class="modal fade show d-block" tabindex="-1" *ngIf="showDetail" style="background:rgba(0,0,0,0.5)" (click)="showDetail = false">
      <div class="modal-dialog modal-xl" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title"><i class="fas fa-file-invoice me-2"></i>Détail facture — {{ selectedFacture?.code }}</h5>
            <button type="button" class="btn-close btn-close-white" (click)="showDetail = false"></button>
          </div>
          <div class="modal-body">
            <div class="row g-3" *ngIf="selectedFacture">
              <div class="col-md-6">
                <div class="p-3 bg-light rounded">
                  <h6 class="fw-bold text-primary mb-3">Informations facture</h6>
                  <div class="row g-2">
                    <div class="col-6 text-muted small">Code:</div>
                    <div class="col-6 fw-bold">{{ selectedFacture.code }}</div>
                    <div class="col-6 text-muted small">Client:</div>
                    <div class="col-6">{{ selectedFacture.client || selectedFacture.clientName || '-' }}</div>
                    <div class="col-6 text-muted small">Montant facture:</div>
                    <div class="col-6 fw-bold text-primary">{{ computeMontant(selectedFacture) | cfa }}</div>
                    <div class="col-6 text-muted small">Taxe:</div>
                    <div class="col-6">{{ selectedFacture.tax ?? 0 }} %</div>
                    <div class="col-6 text-muted small">Remise:</div>
                    <div class="col-6">{{ selectedFacture.remise ?? 0 }} %</div>
                    <div class="col-6 text-muted small">Date:</div>
                    <div class="col-6">{{ selectedFacture.createdAt | date:'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 bg-light rounded">
                  <h6 class="fw-bold text-primary mb-3">Mouvements</h6>
                  <div *ngIf="selectedFacture.mouvements?.length; else noMvt">
                    <div class="table-responsive">
                      <table class="table table-sm mb-0">
                        <thead><tr><th>Produit</th><th>Qté</th><th>PV</th><th>Zone</th></tr></thead>
                        <tbody>
                          <tr *ngFor="let m of selectedFacture.mouvements">
                            <td>{{ m.produit || m.produitCode || m.produitId }}</td>
                            <td>{{ m.qte }}</td>
                            <td>{{ m.pv | cfa }}</td>
                            <td>
                              <span class="badge" [class.bg-primary]="m.stock === 'R1'" [class.bg-info]="m.stock === 'RC'">
                                {{ m.stock }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <ng-template #noMvt><p class="text-muted text-center">Aucun mouvement</p></ng-template>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" (click)="showDetail = false">Fermer</button>
            <button class="btn btn-primary" (click)="printFacture()" *ngIf="selectedFacture?.mouvements?.length">
              <i class="fas fa-print me-2"></i>Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Règlement Modal -->
    <div class="modal fade show d-block" tabindex="-1" *ngIf="showReglementModal" style="background:rgba(0,0,0,0.5)" (click)="closeReglementModal()">
      <div class="modal-dialog modal-sm" (click)="$event.stopPropagation()">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title"><i class="fas fa-money-bill-wave me-2"></i>Règlement</h5>
            <button type="button" class="btn-close btn-close-white" (click)="closeReglementModal()"></button>
          </div>
          <div class="modal-body">
            <!-- Info facture -->
            <div class="p-2 bg-light rounded mb-3 small">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Facture:</span>
                <strong>{{ reglementFacture?.code }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Client:</span>
                <span>{{ reglementFacture?.client || reglementFacture?.clientName || '-' }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted">Montant HT:</span>
                <strong class="text-success">{{ computeMontant(reglementFacture) | cfa }}</strong>
              </div>
            </div>

            <!-- Zone R1 / RC -->
            <div class="mb-3">
              <label class="form-label fw-bold">Zone de règlement</label>
              <div class="d-flex gap-2">
                <button type="button" class="btn w-50 py-2 fw-bold"
                  [class.btn-primary]="reglementZone === 'R1'"
                  [class.btn-outline-primary]="reglementZone !== 'R1'"
                  [disabled]="activeZone === 'RC'"
                  [style.opacity]="activeZone === 'RC' ? '0.4' : '1'"
                  (click)="reglementZone = 'R1'">
                  <i class="fas fa-warehouse me-1"></i>R1
                </button>
                <button type="button" class="btn w-50 py-2 fw-bold"
                  [class.btn-info]="reglementZone === 'RC'"
                  [class.btn-outline-info]="reglementZone !== 'RC'"
                  [disabled]="activeZone === 'R1'"
                  [style.opacity]="activeZone === 'R1' ? '0.4' : '1'"
                  (click)="reglementZone = 'RC'">
                  <i class="fas fa-warehouse me-1"></i>RC
                </button>
              </div>
            </div>

            <form [formGroup]="reglementForm">
              <div class="mb-3">
                <label class="form-label">Montant encaissé (FCFA) *</label>
                <input type="number" class="form-control form-control-lg" formControlName="total"
                  [placeholder]="reglementFacture?.montantHT || 0"
                  [class.is-invalid]="reglementSubmitted && reglementForm.get('total')?.invalid" />
                <div class="invalid-feedback">Montant requis</div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline-secondary" (click)="closeReglementModal()">Annuler</button>
            <button class="btn btn-success" (click)="submitReglement()" [disabled]="savingReglement">
              <span *ngIf="savingReglement" class="spinner-border spinner-border-sm me-2"></span>
              <i *ngIf="!savingReglement" class="fas fa-check me-2"></i>
              {{ savingReglement ? 'Enregistrement...' : 'Régler — ' + reglementZone }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FacturesListComponent implements OnInit, OnDestroy {
  private zoneSub?: Subscription;
  factures: Facture[] = [];
  loading = false;
  totalRecords = 0;
  pageSize = 10;
  currentPage = 0;
  montantTotal = 0;
  impayees = 0;
  activeZone = '';
  dateDebut = '';
  dateFin = '';
  showDetail = false;
  selectedFacture: Facture | null = null;

  showReglementModal = false;
  reglementFacture: Facture | null = null;
  reglementZone: 'R1' | 'RC' = 'R1';
  reglementSubmitted = false;
  savingReglement = false;
  reglementForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '120px' },
    { field: 'client', header: 'Client', sortable: true, format: v => v || '-' },
    { field: '_montant', header: 'Montant facture', align: 'right', format: v => `<strong>${Number(v || 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'taxe', header: 'Taxe', align: 'center', format: v => `${v ?? 0}%` },
    { field: 'remise', header: 'Remise', align: 'center', format: v => `${v ?? 0}%` },
    { field: 'createdAt', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' },
    { field: 'statut', header: 'Statut', align: 'center',
      format: v => v === 'payée'
        ? `<span class="badge bg-success">Payée</span>`
        : `<span class="badge bg-danger">Impayée</span>` }
  ];

  actions: DataTableAction[] = [];

  constructor(
    private factureService: FactureService,
    private authService: AuthService,
    private snackbar: SnackbarService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.reglementForm = this.fb.group({
      total: ['', [Validators.required, Validators.min(1)]]
    });
    this.actions = [
      { label: 'Voir détail', icon: 'fas fa-eye', color: 'blue', action: 'view' },
      { label: 'Régler', icon: 'fas fa-money-bill-wave', color: 'green', action: 'pay',
        hidden: (row: any) => row.statut === 'payée' },
      { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete',
        hidden: () => !this.authService.isSuperAdmin() }
    ];
  }

  ngOnInit(): void {
    this.loadImpayees();
    this.zoneSub = this.route.queryParamMap.subscribe(params => {
      const zone = params.get('zone') || '';
      this.activeZone = zone;
      if (zone === 'R1' || zone === 'RC') this.reglementZone = zone;
      this.currentPage = 0;
      this.loadData();
    });
  }

  ngOnDestroy(): void { this.zoneSub?.unsubscribe(); }

  filterByZone(zone: string): void {
    this.activeZone = zone;
    this.currentPage = 0;
    if (zone === 'R1' || zone === 'RC') this.reglementZone = zone;
    this.loadData();
  }

  computeMontant(f: any): number {
    if (f.mouvements?.length) {
      return f.mouvements.reduce((s: number, m: any) => s + (Number(m.qte ?? 0) * Number(m.pv ?? 0)), 0);
    }
    return Number(f.totalfacture ?? f.montantHT ?? 0);
  }

  searchByDate(): void { this.currentPage = 0; this.loadData(); }

  resetDateFilter(): void { this.dateDebut = ''; this.dateFin = ''; this.currentPage = 0; this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.factureService.list(this.currentPage, this.pageSize, this.activeZone || undefined, this.dateDebut || undefined, this.dateFin || undefined).subscribe({
      next: (res: any) => {
        this.factures = (res?.data?.data || []).map((f: any) => ({ ...f, _montant: this.computeMontant(f) }));
        this.totalRecords = res?.data?.pagination?.total ?? this.factures.length;
        this.montantTotal = this.factures.reduce((acc: number, f: any) => acc + (f._montant ?? 0), 0);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadImpayees(): void {
    this.factureService.countImpayees().subscribe({
      next: (res: any) => { this.impayees = res?.data?.factureTotalImpayeeNumber ?? res?.data?.count ?? 0; }
    });
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.loadData();
  }

  onAction(e: { action: string; row: Facture }): void {
    if (e.action === 'view') {
      this.factureService.detail(e.row.code).subscribe({
        next: (res: any) => {
          const rows: any[] = res?.data?.facturesDetail || [];
          if (rows.length > 0) {
            const first = rows[0];
            this.selectedFacture = {
              ...e.row,
              tax: first.tax ?? e.row.tax,
              remise: first.remise ?? e.row.remise,
              mouvements: rows.map((r: any) => ({
                id: r.id,
                produitId: r.produitId,
                produit: r.produit,
                qte: r.qte,
                pv: r.pv,
                stock: r.stock,
                types: 'OUT' as const
              }))
            };
          } else {
            this.selectedFacture = e.row;
          }
          this.showDetail = true;
        }
      });
    } else if (e.action === 'pay') {
      this.openReglementModal(e.row);
    } else if (e.action === 'delete' && confirm(`Supprimer la facture "${e.row.code}" ?`)) {
      this.factureService.delete(e.row.id).subscribe({
        next: () => { this.snackbar.success('Facture supprimée'); this.loadData(); }
      });
    }
  }

  printFacture(): void {
    const f = this.selectedFacture;
    if (!f) return;
    const fmt = (n: number) => Number(n).toLocaleString('fr-FR');
    const date = f.createdAt ? new Date(f.createdAt).toLocaleDateString('fr-FR') : '-';
    const client = (f as any).client || (f as any).clientName || '-';
    const mouvements: any[] = (f.mouvements || []);
    const rows = mouvements.map((m: any) => {
      const qte = Number(m.qte ?? 0);
      const pv  = Number(m.pv  ?? 0);
      return `<tr>
        <td>${qte}</td>
        <td>${m.produit || '-'}</td>
        <td class="right">${fmt(pv)}</td>
        <td class="right">${fmt(qte * pv)}</td>
      </tr>`;
    }).join('');
    const ht = this.computeMontant(f);
    const tax = Number((f as any).tax ?? (f as any).taxe ?? 0);
    const remise = Number(f.remise ?? 0);
    const remiseAmt = ht * remise / 100;
    const apresRemise = ht - remiseAmt;
    const taxAmt = apresRemise * tax / 100;
    const ttc = apresRemise + taxAmt;
    const remiseRow = remise > 0 ? `<tr><td colspan="3">Remise (${remise}%)</td><td class="right">-${fmt(remiseAmt)} F</td></tr>` : '';
    const taxRow    = tax    > 0 ? `<tr><td colspan="3">TVA (${tax}%)</td><td class="right">+${fmt(taxAmt)} F</td></tr>` : '';
    const ttcRow    = (tax > 0 || remise > 0) ? `<tr style="font-weight:bold;border-top:1px solid #000"><td colspan="3">TOTAL TTC</td><td class="right">${fmt(ttc)} F</td></tr>` : '';
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture ${f.code}</title>
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
  .total-row td{border-top:1px solid #000;font-weight:bold}
  @media print{body{width:auto}}
</style></head><body>
  <div class="centered">
    <h2>CLAUDEX-BAR</h2>
    <p>AGOE AMANDETA EPP Amandeta<br>Face Antenne Togocom<br>Tel : (+228) 92 80 26 38</p>
  </div>
  <div class="sep"></div>
  <p><strong>Facture :</strong> ${f.code}</p>
  <p><strong>Client :</strong> ${client}</p>
  <p><strong>Date :</strong> ${date}</p>
  <div class="sep"></div>
  <table>
    <thead>
      <tr>
        <th style="width:24px">Qté</th>
        <th>Désignation</th>
        <th class="right" style="width:55px">PU (F)</th>
        <th class="right" style="width:60px">Total (F)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr class="total-row"><td colspan="3">TOTAL HT</td><td class="right">${fmt(ht)} F</td></tr>
      ${remiseRow}${taxRow}${ttcRow}
    </tbody>
  </table>
  <div class="sep"></div>
  <p class="centered">Merci de votre commande !</p>
</body></html>`;
    const w = window.open('', '_blank', 'width=350,height=600');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  openReglementModal(facture: Facture): void {
    this.reglementFacture = facture;
    this.reglementForm.reset();
    this.reglementSubmitted = false;
    if (this.activeZone === 'R1' || this.activeZone === 'RC') {
      this.reglementZone = this.activeZone;
    } else {
      const stock = (facture as any).stock as string || '';
      this.reglementZone = stock.startsWith('RC') ? 'RC' : 'R1';
    }
    const montant = this.computeMontant(facture);
    if (montant) {
      this.reglementForm.patchValue({ total: montant });
    }
    this.showReglementModal = true;
  }

  closeReglementModal(): void {
    this.showReglementModal = false;
    this.reglementFacture = null;
    this.savingReglement = false;
  }

  submitReglement(): void {
    this.reglementSubmitted = true;
    if (this.reglementForm.invalid || !this.reglementFacture) return;
    this.savingReglement = true;
    this.factureService.addReglement({
      facture_id: this.reglementFacture.id,
      total: Number(this.reglementForm.value.total)
    }).subscribe({
      next: () => {
        this.snackbar.success(`Règlement ${this.reglementZone} enregistré pour ${this.reglementFacture?.code}`);
        this.closeReglementModal();
        this.loadData();
      },
      error: () => { this.savingReglement = false; }
    });
  }
}
