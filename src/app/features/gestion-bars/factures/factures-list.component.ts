import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { ClientService } from '../../../core/services/client.service';
import { MouvementService } from '../../../core/services/mouvement.service';
import { ProduitService } from '../../../core/services/produit.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { AuthService } from '../../../core/services/auth.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Facture } from '../../../core/models/entities.model';
import { CfaPipe } from '../../../shared/pipes/cfa.pipe';

interface EditLine {
  id?: number;
  produit: string;
  produitId: number;
  qte: number;
  originalQte: number;
  pv: number;
  stock: string;
  isNew: boolean;
}

@Component({
  selector: 'app-factures-list',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DataTableComponent, CfaPipe],
  templateUrl: './factures-list.component.html'
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
  readonly today = new Date().toISOString().split('T')[0];
  dateDebut = this.today;
  dateFin = this.today;
  showDetail = false;
  selectedFacture: Facture | null = null;

  showReglementModal = false;
  reglementFacture: Facture | null = null;
  reglementZone: 'R1' | 'RC' = 'R1';
  reglementSubmitted = false;
  savingReglement = false;
  reglementForm: FormGroup;

  showEditModal = false;
  editFacture: Facture | null = null;
  editSubmitted = false;
  savingEdit = false;
  editForm: FormGroup;
  editTab: 'infos' | 'lignes' = 'infos';
  editZone = '';
  editLines: EditLine[] = [];
  deletedLineIds: number[] = [];
  editProduits: any[] = [];
  editStockMap = new Map<number, number>();
  editNewProductId: number | null = null;
  editNewQty = 1;
  loadingEditDetail = false;
  clients: any[] = [];

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
    private clientService: ClientService,
    private mouvementService: MouvementService,
    private produitService: ProduitService,
    private authService: AuthService,
    private snackbar: SnackbarService,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.reglementForm = this.fb.group({
      total: ['', [Validators.required, Validators.min(1)]]
    });
    this.editForm = this.fb.group({
      client_id: ['', Validators.required],
      tax: [0, [Validators.min(0), Validators.max(100)]],
      remise: [0, [Validators.min(0), Validators.max(100)]]
    });
    this.actions = [
      { label: 'Voir détail', icon: 'fas fa-eye', color: 'blue', action: 'view' },
      { label: 'Modifier', icon: 'fas fa-edit', color: 'orange', action: 'edit',
        hidden: (row: any) => {
          if (row.statut === 'payée') return true;
          if (this.authService.isAdmin()) return false;
          if (this.authService.isFacturier()) return false;
          return true;
        }
      },
      { label: 'Régler', icon: 'fas fa-money-bill-wave', color: 'green', action: 'pay',
        hidden: (row: any) => row.statut === 'payée' },
      { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete',
        hidden: (row: any) => !this.authService.isSuperAdmin() || row.statut === 'payée' }
    ];
  }

  ngOnInit(): void {
    this.loadClients();
    this.zoneSub = this.route.queryParamMap.subscribe(params => {
      const zone = params.get('zone') || '';
      this.activeZone = zone;
      if (zone === 'R1' || zone === 'RC') this.reglementZone = zone;
      this.currentPage = 0;
      this.loadData();
      this.loadImpayees();
    });
  }

  ngOnDestroy(): void { this.zoneSub?.unsubscribe(); }

  filterByZone(zone: string): void {
    this.activeZone = zone;
    this.currentPage = 0;
    if (zone === 'R1' || zone === 'RC') this.reglementZone = zone;
    this.loadData();
    this.loadImpayees();
  }

  computeMontant(f: any): number {
    if (f.mouvements?.length) {
      return f.mouvements.reduce((s: number, m: any) => s + (Number(m.qte ?? 0) * Number(m.pv ?? 0)), 0);
    }
    return Number(f.totalfacture ?? f.montantHT ?? 0);
  }

  searchByDate(): void { this.currentPage = 0; this.loadData(); this.loadImpayees(); }

  resetDateFilter(): void { this.dateDebut = this.today; this.dateFin = this.today; this.currentPage = 0; this.loadData(); this.loadImpayees(); }

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

  loadClients(): void {
    this.clientService.list(0, 999).subscribe({
      next: (res: any) => { this.clients = res?.data?.data ?? []; }
    });
  }

  loadImpayees(): void {
    const zone = this.activeZone || undefined;
    const debut = this.dateDebut || undefined;
    const fin = this.dateFin || undefined;
    if (this.authService.isFacturier() && this.activeZone) {
      this.factureService.list(0, 9999, zone, debut, fin).subscribe({
        next: (res: any) => {
          const all: any[] = res?.data?.data || [];
          this.impayees = all.filter((f: any) => f.statut !== 'payée').length;
        }
      });
    } else {
      this.factureService.countImpayees(zone, debut, fin).subscribe({
        next: (res: any) => { this.impayees = res?.data?.factureTotalImpayeeNumber ?? res?.data?.count ?? 0; }
      });
    }
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
    } else if (e.action === 'edit') {
      this.openEditModal(e.row);
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
    const date = f.createdAt ? String(f.createdAt).split('T')[0].split('-').reverse().join('/') : '-';
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
  strong{font-weight:900}
  .total-row td{border-top:2px solid #000;font-weight:900;font-size:14px}
  @media print{
    *{color:#000!important;background:transparent!important;font-weight:600!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    h2{font-weight:900!important;font-size:15px!important}
    th{font-weight:800!important}
    .total-row td{font-weight:900!important;font-size:14px!important}
    body{width:auto}
  }
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

  openEditModal(facture: Facture): void {
    this.editFacture = facture;
    this.editSubmitted = false;
    this.savingEdit = false;
    this.editTab = 'infos';
    this.editLines = [];
    this.deletedLineIds = [];
    this.editNewProductId = null;
    this.editNewQty = 1;
    this.editZone = (facture as any).stock?.includes('RC') ? 'RC' : 'R1';

    this.editForm.patchValue({
      client_id: (facture as any).client_id ?? '',
      tax: (facture as any).taxe ?? facture.tax ?? 0,
      remise: facture.remise ?? 0
    });

    this.loadingEditDetail = true;
    this.showEditModal = true;

    Promise.allSettled([
      this.factureService.detail(facture.code).toPromise(),
      this.mouvementService.stockDispo(this.editZone).toPromise(),
      this.produitService.list(0, 999, this.editZone).toPromise()
    ]).then(([detailRes, stockRes, produitsRes]) => {
      if (detailRes.status === 'fulfilled') {
        const rows: any[] = (detailRes.value as any)?.data?.facturesDetail ?? [];
        this.editLines = rows.map(r => ({
          id: r.id,
          produit: r.produit,
          produitId: r.produitId,
          qte: Number(r.qte),
          originalQte: Number(r.qte),
          pv: Number(r.pv),
          stock: r.stock,
          isNew: false
        }));
      }
      if (stockRes.status === 'fulfilled') {
        const items: any[] = (stockRes.value as any)?.data?.data ?? [];
        this.editStockMap.clear();
        items.forEach(i => { if (i.id) this.editStockMap.set(i.id, i.st_dispo ?? 0); });
      }
      if (produitsRes.status === 'fulfilled') {
        this.editProduits = (produitsRes.value as any)?.data?.data ?? [];
      }
      this.loadingEditDetail = false;
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editFacture = null;
    this.savingEdit = false;
  }

  getEditStock(produitId: number): number {
    const base = this.editStockMap.get(produitId) ?? 0;
    const inLines = this.editLines
      .filter(l => l.produitId === produitId && !l.isNew)
      .reduce((s, l) => s + l.originalQte, 0);
    return base + inLines;
  }

  addEditLine(): void {
    if (!this.editNewProductId || this.editNewQty < 1) return;
    const produit = this.editProduits.find(p => p.id === Number(this.editNewProductId));
    if (!produit) return;
    const dispo = this.getEditStock(produit.id);
    if (this.editNewQty > dispo) {
      this.snackbar.error(`Stock insuffisant pour ${produit.name} (${dispo} dispo)`);
      return;
    }
    this.editLines.push({
      produit: produit.name,
      produitId: produit.id,
      qte: this.editNewQty,
      originalQte: 0,
      pv: produit.pv ?? 0,
      stock: this.editZone,
      isNew: true
    });
    this.editNewProductId = null;
    this.editNewQty = 1;
  }

  removeEditLine(index: number): void {
    const line = this.editLines[index];
    if (line.id) this.deletedLineIds.push(line.id);
    this.editLines.splice(index, 1);
  }

  get editMontantTotal(): number {
    return this.editLines.reduce((s, l) => s + l.qte * l.pv, 0);
  }

  submitEdit(): void {
    this.editSubmitted = true;
    if (this.editForm.invalid || !this.editFacture) return;
    this.savingEdit = true;

    const factureId = this.editFacture.id;
    const ops: Promise<any>[] = [];

    ops.push(this.factureService.update({
      id: factureId,
      client_id: Number(this.editForm.value.client_id),
      tax: Number(this.editForm.value.tax ?? 0),
      remise: Number(this.editForm.value.remise ?? 0)
    }).toPromise());

    this.deletedLineIds.forEach(id => {
      ops.push(this.mouvementService.delete(id).toPromise());
    });

    this.editLines.forEach(line => {
      if (!line.isNew && line.id && line.qte !== line.originalQte) {
        ops.push(this.mouvementService.update({ id: line.id, qte: line.qte } as any).toPromise());
      }
      if (line.isNew) {
        ops.push(this.factureService.addLigne({
          productId: line.produitId,
          facture_id: factureId,
          stock: line.stock as 'R1' | 'RC',
          quantity: line.qte
        }).toPromise());
      }
    });

    Promise.allSettled(ops).then(results => {
      const errors = results.filter(r => r.status === 'rejected');
      if (errors.length === 0) {
        this.snackbar.success(`Facture ${this.editFacture?.code} modifiée`);
      } else {
        this.snackbar.error(`Facture modifiée avec ${errors.length} erreur(s)`);
      }
      this.closeEditModal();
      this.loadData();
    });
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
