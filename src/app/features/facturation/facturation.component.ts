import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { FactureService } from '../../core/services/facture.service';
import { ClientService } from '../../core/services/client.service';
import { ProduitService } from '../../core/services/produit.service';
import { MouvementService } from '../../core/services/mouvement.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { Client, Produit, Facture } from '../../core/models/entities.model';
import { CfaPipe } from '../../shared/pipes/cfa.pipe';

interface CartItem {
  produit: Produit;
  quantity: number;
}

@Component({
  selector: 'app-facturation',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, CfaPipe],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-cash-register me-2 text-primary"></i>Facturation</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item active">Facturation — Zone {{ activeZone }}</li>
          </ol>
        </nav>
      </div>
      <!-- Sélecteur de zone -->
      <div class="d-flex gap-2">
        <button class="btn px-4 py-2 fw-bold" [class.btn-primary]="activeZone === 'R1'" [class.btn-outline-primary]="activeZone !== 'R1'"
          [disabled]="submitting || (zoneLocked && activeZone !== 'R1')"
          [style.opacity]="(zoneLocked && activeZone !== 'R1') ? '0.4' : '1'"
          [style.cursor]="(zoneLocked && activeZone !== 'R1') ? 'not-allowed' : 'pointer'"
          (click)="switchZone('R1')">
          <i class="fas fa-warehouse me-2"></i>Zone R1
        </button>
        <button class="btn px-4 py-2 fw-bold" [class.btn-info]="activeZone === 'RC'" [class.btn-outline-info]="activeZone !== 'RC'"
          [disabled]="submitting || (zoneLocked && activeZone !== 'RC')"
          [style.opacity]="(zoneLocked && activeZone !== 'RC') ? '0.4' : '1'"
          [style.cursor]="(zoneLocked && activeZone !== 'RC') ? 'not-allowed' : 'pointer'"
          (click)="switchZone('RC')">
          <i class="fas fa-warehouse me-2"></i>Zone RC
        </button>
      </div>
    </div>

    <!-- Loading initial -->
    <div *ngIf="loading" class="text-center py-5">
      <div class="spinner-border text-primary"></div>
      <p class="mt-2 text-muted">Chargement des données...</p>
    </div>

    <div class="row g-4" *ngIf="!loading">

      <!-- Colonne gauche -->
      <div class="col-lg-8">

        <!-- Infos facture -->
        <div class="card-custom mb-4">
          <div class="card-header">
            <i class="fas fa-file-invoice me-2"></i>Informations de la facture
            <span class="badge ms-2" [class.bg-primary]="activeZone === 'R1'" [class.bg-info]="activeZone === 'RC'">
              Zone {{ activeZone }}
            </span>
          </div>
          <div class="card-body">
            <form [formGroup]="factureForm">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Code facture *</label>
                  <div class="input-group">
                    <input type="text" class="form-control font-monospace bg-light" formControlName="code"
                      readonly [class.is-invalid]="submitted && factureForm.get('code')?.invalid" />
                    <button type="button" class="btn btn-outline-secondary" title="Régénérer le code"
                      (click)="generateCode()" [disabled]="generatingCode">
                      <span *ngIf="generatingCode" class="spinner-border spinner-border-sm"></span>
                      <i *ngIf="!generatingCode" class="fas fa-sync-alt"></i>
                    </button>
                  </div>
                  <div class="invalid-feedback d-block" *ngIf="submitted && factureForm.get('code')?.invalid">Code requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Client *</label>
                  <select class="form-select" formControlName="client_id"
                    [class.is-invalid]="submitted && factureForm.get('client_id')?.invalid">
                    <option value="">— Choisir un client —</option>
                    <option *ngFor="let c of clients" [value]="c.id">{{ c.name }}</option>
                  </select>
                  <div class="invalid-feedback">Client requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Taxe (%)</label>
                  <input type="number" class="form-control" formControlName="tax" placeholder="0" min="0" max="100" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Remise (%)</label>
                  <input type="number" class="form-control" formControlName="remise" placeholder="0" min="0" max="100" />
                </div>
              </div>
            </form>
          </div>
        </div>

        <!-- Catalogue produits -->
        <div class="card-custom">
          <div class="card-header">
            <i class="fas fa-boxes me-2"></i>Produits — Zone {{ activeZone }}
            <span class="badge bg-secondary ms-2">{{ filteredProduits.length }}</span>
          </div>
          <div class="card-body">
            <!-- Recherche -->
            <div class="position-relative mb-3">
              <i class="fas fa-search position-absolute text-muted" style="left:12px;top:50%;transform:translateY(-50%)"></i>
              <input type="text" class="form-control ps-5" [(ngModel)]="search" placeholder="Rechercher un produit..." />
              <button *ngIf="search" type="button" class="btn-close position-absolute" style="right:12px;top:50%;transform:translateY(-50%)" (click)="search = ''"></button>
            </div>

            <!-- Grille produits -->
            <div class="row g-3" style="max-height:420px;overflow-y:auto">
              <div class="col-sm-6 col-md-4" *ngFor="let p of filteredProduits">
                <button type="button" class="w-100 text-start border rounded p-3 btn-produit"
                  [class.btn-produit-ok]="getStatut(p.id) === 'ok'"
                  [class.btn-produit-faible]="getStatut(p.id) === 'faible'"
                  [class.btn-produit-epuise]="getStatut(p.id) === 'epuise'"
                  [disabled]="getStatut(p.id) === 'epuise' || submitting"
                  (click)="addToCart(p)">
                  <div class="d-flex justify-content-between align-items-start mb-1">
                    <span class="fw-semibold small lh-sm">{{ p.name }}</span>
                    <span *ngIf="getStatut(p.id) === 'epuise'" class="badge bg-danger ms-1" style="font-size:0.65rem">Épuisé</span>
                    <span *ngIf="getStatut(p.id) === 'faible'" class="badge bg-warning text-dark ms-1" style="font-size:0.65rem">Faible</span>
                  </div>
                  <div class="text-primary fw-bold small">{{ p.pv | cfa }}</div>
                  <div class="mt-1 d-flex align-items-center gap-2">
                    <span class="small" [class.text-success]="getStatut(p.id) === 'ok'" [class.text-warning]="getStatut(p.id) === 'faible'" [class.text-danger]="getStatut(p.id) === 'epuise'">
                      <i class="fas fa-cubes me-1"></i>{{ getStock(p.id) }} en stock
                    </span>
                    <span *ngIf="getEnPanier(p.id) > 0" class="small text-muted">· {{ getEnPanier(p.id) }} au panier</span>
                  </div>
                </button>
              </div>
              <div class="col-12 text-center py-4 text-muted" *ngIf="filteredProduits.length === 0 && !loadingProduits">
                <i class="fas fa-box-open fs-3 d-block mb-2 opacity-25"></i>
                <span class="small">{{ search ? 'Aucun produit trouvé pour "' + search + '"' : 'Aucun produit pour la zone ' + activeZone }}</span>
              </div>
              <div class="col-12 text-center py-4" *ngIf="loadingProduits">
                <div class="spinner-border spinner-border-sm text-primary"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Colonne droite -->
      <div class="col-lg-4">

        <!-- Panier -->
        <div class="card-custom mb-4">
          <div class="card-header">
            <i class="fas fa-shopping-cart me-2"></i>Panier
            <span class="badge bg-primary ms-auto">{{ cart.length }}</span>
          </div>
          <div class="card-body p-0">
            <div style="max-height:300px;overflow-y:auto">
              <div class="p-3 text-center text-muted" *ngIf="cart.length === 0">
                <i class="fas fa-shopping-cart fs-3 d-block mb-2 opacity-25"></i>
                <span class="small">Panier vide — cliquez sur un produit</span>
              </div>
              <div *ngFor="let item of cart; let i = index" class="border-bottom px-3 py-2">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <span class="fw-semibold small">{{ item.produit.name }}</span>
                  <button type="button" class="btn btn-link btn-sm text-danger p-0 ms-2" (click)="removeFromCart(i)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <div class="d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center gap-2">
                    <label class="small text-muted mb-0">Qté:</label>
                    <input type="number" min="1" [max]="getStock(item.produit.id)" [value]="item.quantity"
                      (change)="updateQty(i, +$any($event.target).value)"
                      class="form-control form-control-sm text-center" style="width:60px" />
                    <small class="text-muted">/ {{ getStock(item.produit.id) }}</small>
                  </div>
                  <strong class="small text-primary">{{ (item.produit.pv * item.quantity) | cfa }}</strong>
                </div>
                <div *ngIf="item.quantity > getStock(item.produit.id)" class="text-danger small mt-1">
                  <i class="fas fa-exclamation-triangle me-1"></i>Dépasse le stock dispo
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Résumé financier -->
        <div class="card-custom mb-4">
          <div class="card-header"><i class="fas fa-calculator me-2"></i>Résumé financier</div>
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2 small">
              <span class="text-muted">Sous-total</span>
              <span class="fw-semibold">{{ getSousTotal() | cfa }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2 small">
              <span class="text-muted">Taxe ({{ factureForm.get('tax')?.value || 0 }}%)</span>
              <span class="fw-semibold">+ {{ getTaxe() | cfa }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2 small">
              <span class="text-muted">Remise ({{ factureForm.get('remise')?.value || 0 }}%)</span>
              <span class="fw-semibold text-success">- {{ getRemise() | cfa }}</span>
            </div>
            <div class="d-flex justify-content-between pt-2 border-top">
              <span class="fw-bold">Total TTC</span>
              <span class="fw-bold fs-6 text-primary">{{ getTotal() | cfa }}</span>
            </div>

            <div *ngIf="hasStockError()" class="alert alert-danger small mt-3 mb-0 py-2">
              <i class="fas fa-exclamation-triangle me-1"></i>Corrigez les quantités en rouge.
            </div>

            <div class="d-flex gap-2 mt-3">
              <button type="button" class="btn btn-outline-secondary btn-sm flex-shrink-0" (click)="resetAll()" [disabled]="submitting">
                <i class="fas fa-redo"></i>
              </button>
              <button type="button" class="btn btn-primary w-100" (click)="creerFacture()"
                [disabled]="submitting || cart.length === 0 || hasStockError()">
                <span *ngIf="submitting" class="spinner-border spinner-border-sm me-2"></span>
                <i *ngIf="!submitting" class="fas fa-file-invoice me-2"></i>
                {{ submitting ? 'Création...' : 'Créer la facture' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Règlement (affiché après création facture) -->
        <div class="card-custom" *ngIf="factureCreee">
          <div class="card-header bg-success text-white">
            <i class="fas fa-check-circle me-2"></i>Facture créée — Encaissement
          </div>
          <div class="card-body">
            <div class="p-3 bg-light rounded mb-3 small">
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Facture:</span>
                <strong>{{ factureCreee.code }}</strong>
              </div>
              <div class="d-flex justify-content-between mb-1">
                <span class="text-muted">Zone:</span>
                <span class="badge" [class.bg-primary]="activeZone === 'R1'" [class.bg-info]="activeZone === 'RC'">{{ activeZone }}</span>
              </div>
              <div class="d-flex justify-content-between">
                <span class="text-muted">Total TTC:</span>
                <strong class="text-success">{{ montantFacture | cfa }}</strong>
              </div>
            </div>
            <form [formGroup]="reglementForm" (ngSubmit)="enregistrerReglement()">
              <div class="mb-3">
                <label class="form-label">Montant encaissé (FCFA) *</label>
                <input type="number" class="form-control form-control-lg" formControlName="total"
                  [placeholder]="montantFacture"
                  [class.is-invalid]="reglementSubmitted && reglementForm.get('total')?.invalid" />
                <div class="invalid-feedback">Montant requis</div>
              </div>
              <button type="submit" class="btn btn-success w-100" [disabled]="addingReglement">
                <span *ngIf="addingReglement" class="spinner-border spinner-border-sm me-2"></span>
                <i *ngIf="!addingReglement" class="fas fa-check me-2"></i>
                {{ addingReglement ? 'Enregistrement...' : 'Confirmer le règlement' }}
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .btn-produit {
      background: #fff;
      transition: all .15s;
      border-color: #dee2e6 !important;
    }
    .btn-produit-ok:hover:not(:disabled) {
      border-color: #0d6efd !important;
      background: #f0f5ff;
    }
    .btn-produit-faible {
      border-color: #ffc107 !important;
      background: #fffbf0;
    }
    .btn-produit-faible:hover:not(:disabled) {
      border-color: #e0a800 !important;
      background: #fff3cd;
    }
    .btn-produit-epuise {
      opacity: .55;
      cursor: not-allowed;
      background: #f8f9fa;
    }
  `]
})
export class FacturationComponent implements OnInit, OnDestroy {
  private zoneSub?: Subscription;
  clients: Client[] = [];
  produits: Produit[] = [];
  cart: CartItem[] = [];
  activeZone: 'R1' | 'RC' = 'R1';
  zoneLocked = false;
  search = '';
  loading = false;
  loadingProduits = false;
  submitting = false;
  submitted = false;
  reglementSubmitted = false;
  addingReglement = false;

  factureCreee: Facture | null = null;
  montantFacture = 0;

  private stockMap = new Map<number, { R1: number; RC: number }>();

  generatingCode = false;
  get currentMonth(): string {
    return (new Date().getMonth() + 1).toString().padStart(2, '0');
  }

  factureForm: FormGroup;
  reglementForm: FormGroup;

  get filteredProduits(): Produit[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.produits;
    return this.produits.filter(p => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q));
  }

  constructor(
    private factureService: FactureService,
    private clientService: ClientService,
    private produitService: ProduitService,
    private mouvementService: MouvementService,
    private snackbar: SnackbarService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.factureForm = this.fb.group({
      code: ['', Validators.required],
      client_id: ['', Validators.required],
      tax: [0],
      remise: [0]
    });
    this.reglementForm = this.fb.group({
      total: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.zoneSub = this.route.queryParamMap.subscribe(params => {
      const zone = params.get('zone');
      if (zone === 'R1' || zone === 'RC') {
        this.activeZone = zone;
        this.zoneLocked = true;
      }
      this.loadAll();
      this.generateCode();
    });
  }

  ngOnDestroy(): void { this.zoneSub?.unsubscribe(); }

  generateCode(): void {
    this.generatingCode = true;
    this.factureService.list(0, 1000, this.activeZone).subscribe({
      next: (res: any) => {
        const factures: any[] = res?.data?.data ?? [];
        let maxNum = 0;
        for (const f of factures) {
          const parts: string[] = (f?.code ?? '').split('/');
          const n = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
        const num = (maxNum + 1).toString().padStart(4, '0');
        const code = `${this.activeZone}/BAR/${this.currentMonth}/${num}`;
        this.factureForm.patchValue({ code });
        this.generatingCode = false;
      },
      error: () => { this.generatingCode = false; }
    });
  }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      clients: this.clientService.list(0, 999),
      r1: this.mouvementService.stockDispo('R1'),
      rc: this.mouvementService.stockDispo('RC')
    }).subscribe({
      next: (res: any) => {
        this.clients = res.clients?.data?.data || [];
        const r1Data: any[] = res.r1?.data?.data || [];
        const rcData: any[] = res.rc?.data?.data || [];
        this.buildStockMap(r1Data, rcData);
        this.loading = false;
        this.loadProduits();
      },
      error: () => { this.loading = false; }
    });
  }

  private buildStockMap(r1Data: any[], rcData: any[]): void {
    this.stockMap.clear();
    r1Data.forEach(item => {
      if (item.id) this.stockMap.set(item.id, { R1: item.st_dispo ?? 0, RC: 0 });
    });
    rcData.forEach(item => {
      if (!item.id) return;
      const existing = this.stockMap.get(item.id);
      if (existing) existing.RC = item.st_dispo ?? 0;
      else this.stockMap.set(item.id, { R1: 0, RC: item.st_dispo ?? 0 });
    });
  }

  private refreshStock(): void {
    forkJoin({
      r1: this.mouvementService.stockDispo('R1'),
      rc: this.mouvementService.stockDispo('RC')
    }).subscribe({
      next: (res: any) => {
        this.buildStockMap(res.r1?.data?.data || [], res.rc?.data?.data || []);
      }
    });
  }

  loadProduits(): void {
    this.loadingProduits = true;
    this.produits = [];
    this.produitService.list(0, 999, this.activeZone).subscribe({
      next: (res: any) => { this.produits = res?.data?.data || []; this.loadingProduits = false; },
      error: () => { this.loadingProduits = false; }
    });
  }

  switchZone(zone: 'R1' | 'RC'): void {
    if (zone === this.activeZone) return;
    this.activeZone = zone;
    this.cart = [];
    this.search = '';
    this.loadProduits();
    this.generateCode();
  }

  getStock(produitId: number): number {
    const s = this.stockMap.get(produitId);
    return s ? s[this.activeZone] : 0;
  }

  getStatut(produitId: number): 'ok' | 'faible' | 'epuise' {
    const stock = this.getStock(produitId);
    const produit = this.produits.find(p => p.id === produitId);
    const seuil = produit?.stock_min ?? 0;
    if (stock <= 0) return 'epuise';
    if (seuil > 0 && stock <= seuil) return 'faible';
    return 'ok';
  }

  getEnPanier(produitId: number): number {
    return this.cart.find(i => i.produit.id === produitId)?.quantity ?? 0;
  }

  addToCart(produit: Produit): void {
    const stock = this.getStock(produit.id);
    const existing = this.cart.find(i => i.produit.id === produit.id);
    if (existing) {
      if (existing.quantity >= stock) {
        this.snackbar.error(`Stock max atteint pour ${produit.name} (${stock} dispo)`);
        return;
      }
      existing.quantity++;
    } else {
      this.cart.push({ produit, quantity: 1 });
    }
  }

  removeFromCart(index: number): void {
    this.cart.splice(index, 1);
  }

  updateQty(index: number, qty: number): void {
    if (qty <= 0) return;
    const stock = this.getStock(this.cart[index].produit.id);
    this.cart[index] = { ...this.cart[index], quantity: Math.min(qty, stock) };
  }

  hasStockError(): boolean {
    return this.cart.some(i => i.quantity > this.getStock(i.produit.id));
  }

  getSousTotal(): number {
    return this.cart.reduce((acc, i) => acc + i.produit.pv * i.quantity, 0);
  }

  getTaxe(): number {
    return this.getSousTotal() * (parseFloat(this.factureForm.get('tax')?.value || 0) / 100);
  }

  getRemise(): number {
    return this.getSousTotal() * (parseFloat(this.factureForm.get('remise')?.value || 0) / 100);
  }

  getTotal(): number {
    return this.getSousTotal() + this.getTaxe() - this.getRemise();
  }

  creerFacture(): void {
    this.submitted = true;
    if (this.factureForm.invalid) { this.snackbar.error('Remplissez le code et le client'); return; }
    if (this.cart.length === 0) { this.snackbar.error('Ajoutez au moins un produit'); return; }
    if (this.hasStockError()) return;

    this.submitting = true;
    const data = {
      code: this.factureForm.value.code,
      client_id: Number(this.factureForm.value.client_id),
      tax: parseFloat(this.factureForm.value.tax || 0),
      remise: parseFloat(this.factureForm.value.remise || 0)
    };

    this.factureService.create(data).subscribe({
      next: (res: any) => {
        const facture: Facture = res?.data;
        if (!facture?.id) { this.submitting = false; return; }
        this.addLignesSequentiellement(facture);
      },
      error: () => { this.submitting = false; }
    });
  }

  private addLignesSequentiellement(facture: Facture): void {
    const lignes = [...this.cart];
    let index = 0;

    const addNext = () => {
      if (index >= lignes.length) {
        this.factureCreee = facture;
        this.montantFacture = this.getTotal();
        this.reglementForm.patchValue({ total: this.montantFacture });
        this.snackbar.success(`Facture ${facture.code} créée — ${lignes.length} ligne(s) ajoutée(s)`);
        this.submitting = false;
        this.cart = [];
        this.submitted = false;
        this.factureForm.reset({ tax: 0, remise: 0 });
        this.generateCode();
        return;
      }
      const item = lignes[index];
      this.factureService.addLigne({
        facture_id: facture.id,
        productId: item.produit.id,
        stock: this.activeZone,
        quantity: item.quantity
      }).subscribe({
        next: () => { index++; addNext(); },
        error: () => {
          this.snackbar.error(`Erreur ligne ${item.produit.name} — facture créée quand même`);
          index++;
          addNext();
        }
      });
    };

    addNext();
  }

  enregistrerReglement(): void {
    this.reglementSubmitted = true;
    if (this.reglementForm.invalid || !this.factureCreee) return;
    this.addingReglement = true;
    this.factureService.addReglement({
      facture_id: this.factureCreee.id,
      total: Number(this.reglementForm.value.total)
    }).subscribe({
      next: () => {
        this.snackbar.success('Règlement enregistré avec succès');
        this.addingReglement = false;
        this.factureCreee = null;
        this.reglementForm.reset();
        this.reglementSubmitted = false;
        this.montantFacture = 0;
        this.refreshStock();
      },
      error: () => { this.addingReglement = false; }
    });
  }

  resetAll(): void {
    this.cart = [];
    this.search = '';
    this.submitted = false;
    this.factureForm.reset({ tax: 0, remise: 0 });
    this.generateCode();
  }
}
