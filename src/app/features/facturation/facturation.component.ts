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
  templateUrl: './facturation.component.html',
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
    const month = this.currentMonth;
    this.factureService.list(0, 1000, this.activeZone).subscribe({
      next: (res: any) => {
        const factures: any[] = res?.data?.data ?? [];
        let maxNum = 0;
        for (const f of factures) {
          const parts: string[] = (f?.code ?? '').split('/');
          // Only consider factures of the current month (format: ZONE/BAR/MM/NNNN)
          if (parts.length >= 4 && parts[2] === month) {
            const n = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        const num = (maxNum + 1).toString().padStart(4, '0');
        const code = `${this.activeZone}/BAR/${month}/${num}`;
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
