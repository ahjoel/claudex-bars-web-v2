import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProduitService } from '../../../core/services/produit.service';
import { ModelCategoryService } from '../../../core/services/model-category.service';
import { FournisseurService } from '../../../core/services/fournisseur.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Produit, ModelCategory, Fournisseur } from '../../../core/models/entities.model';

@Component({
  selector: 'app-produits-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <i class="fas fa-box me-2 text-primary"></i>Produits
          <span *ngIf="zone" class="badge ms-2" [class.bg-primary]="zone === 'R1'" [class.bg-success]="zone === 'RC'" style="font-size:0.7rem;vertical-align:middle">Zone {{ zone }}</span>
        </h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Gestion Bars</li>
            <li class="breadcrumb-item active">Produits{{ zone ? ' — Zone ' + zone : '' }}</li>
          </ol>
        </nav>
      </div>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="fas fa-plus me-2"></i>Nouveau produit
      </button>
    </div>

    <!-- Zone tabs -->
    <div class="d-flex gap-2 mb-4">
      <button class="btn btn-sm px-4" [class.btn-primary]="zone === ''" [class.btn-outline-secondary]="zone !== ''"
        [disabled]="zone === 'R1' || zone === 'RC'"
        [style.opacity]="(zone === 'R1' || zone === 'RC') ? '0.4' : '1'"
        [style.cursor]="(zone === 'R1' || zone === 'RC') ? 'not-allowed' : 'pointer'"
        (click)="filterByZone('')">
        <i class="fas fa-list me-1"></i>Toutes
      </button>
      <button class="btn btn-sm px-4" [class.btn-primary]="zone === 'R1'" [class.btn-outline-primary]="zone !== 'R1'"
        [disabled]="zone === 'RC'"
        [style.opacity]="zone === 'RC' ? '0.4' : '1'"
        [style.cursor]="zone === 'RC' ? 'not-allowed' : 'pointer'"
        (click)="filterByZone('R1')">
        <i class="fas fa-warehouse me-1"></i>Zone R1
      </button>
      <button class="btn btn-sm px-4" [class.btn-info]="zone === 'RC'" [class.btn-outline-info]="zone !== 'RC'"
        [disabled]="zone === 'R1'"
        [style.opacity]="zone === 'R1' ? '0.4' : '1'"
        [style.cursor]="zone === 'R1' ? 'not-allowed' : 'pointer'"
        (click)="filterByZone('RC')">
        <i class="fas fa-warehouse me-1"></i>Zone RC
      </button>
    </div>

    <div class="card-custom">
      <div class="card-header"><i class="fas fa-list me-2"></i>Catalogue produits{{ zone ? ' — Zone ' + zone : '' }} ({{ totalRecords }})</div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="produits"
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

    <div class="modal fade show d-block" tabindex="-1" *ngIf="showModal" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title"><i class="fas fa-box me-2"></i>{{ editingId ? 'Modifier' : 'Nouveau' }} produit</h5>
            <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Code *</label>
                  <input type="text" class="form-control" formControlName="code" placeholder="Code produit"
                    [class.is-invalid]="submitted && form.get('code')?.invalid" />
                  <div class="invalid-feedback">Code requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Nom *</label>
                  <input type="text" class="form-control" formControlName="name" placeholder="Nom du produit"
                    [class.is-invalid]="submitted && form.get('name')?.invalid" />
                  <div class="invalid-feedback">Nom requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Catégorie *</label>
                  <select class="form-select" formControlName="modelId" [class.is-invalid]="submitted && form.get('modelId')?.invalid">
                    <option value="">Sélectionner...</option>
                    <option *ngFor="let m of modeles" [value]="m.id">{{ m.name }}</option>
                  </select>
                  <div class="invalid-feedback">Catégorie requise</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Fournisseur</label>
                  <select class="form-select" formControlName="fournisseurId">
                    <option value="">Sélectionner...</option>
                    <option *ngFor="let f of fournisseurs" [value]="f.id">{{ f.name }}</option>
                  </select>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Prix de vente (FCFA) *</label>
                  <input type="number" class="form-control" formControlName="pv" placeholder="0"
                    [class.is-invalid]="submitted && form.get('pv')?.invalid" />
                  <div class="invalid-feedback">Prix requis</div>
                </div>
                <div class="col-md-4">
                  <label class="form-label">Stock minimum</label>
                  <input type="number" class="form-control" formControlName="stock_min" placeholder="0" />
                </div>
                <div class="col-md-4">
                  <label class="form-label">Zone *</label>
                  <select class="form-select" formControlName="stock"
                    [class.is-invalid]="submitted && form.get('stock')?.invalid">
                    <option value="">Sélectionner...</option>
                    <option value="R1">Zone R1</option>
                    <option value="RC">Zone RC</option>
                  </select>
                  <div class="invalid-feedback">Zone requise</div>
                  <small *ngIf="zone" class="text-muted"><i class="fas fa-lock me-1"></i>Fixée par la navigation (Zone {{ zone }})</small>
                </div>
                <div class="col-12">
                  <label class="form-label">Description</label>
                  <textarea class="form-control" formControlName="description" rows="2" placeholder="Description..."></textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" (click)="closeModal()">Annuler</button>
              <button type="submit" class="btn btn-primary" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-2"></span>
                {{ saving ? 'Enregistrement...' : (editingId ? 'Modifier' : 'Enregistrer') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class ProduitsListComponent implements OnInit, OnDestroy {
  private zoneSub?: Subscription;
  produits: Produit[] = [];
  modeles: ModelCategory[] = [];
  fournisseurs: Fournisseur[] = [];
  loading = false;
  saving = false;
  showModal = false;
  editingId: number | null = null;
  submitted = false;
  totalRecords = 0;
  pageSize = 10;
  currentPage = 0;
  form: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '100px' },
    { field: 'name', header: 'Nom', sortable: true },
    { field: 'stock', header: 'Zone', align: 'center', width: '80px',
      format: v => v === 'R1'
        ? `<span class="badge bg-primary">R1</span>`
        : `<span class="badge bg-success">RC</span>` },
    { field: 'pv', header: 'Prix vente', align: 'right', format: v => `<strong>${Number(v).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'stock_min', header: 'Stock min', align: 'center', format: v => v ?? '-' },
    { field: 'createdAt', header: 'Ajouté le', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  zone = '';

  constructor(
    private produitService: ProduitService,
    private modelService: ModelCategoryService,
    private fournisseurService: FournisseurService,
    private snackbar: SnackbarService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      modelId: ['', Validators.required],
      fournisseurId: [''],
      pv: ['', [Validators.required, Validators.min(0)]],
      stock_min: [''],
      stock: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadLists();
    this.zoneSub = this.route.queryParamMap.subscribe(params => {
      this.zone = params.get('zone') || '';
      this.currentPage = 0;
      this.loadData();
    });
  }

  ngOnDestroy(): void { this.zoneSub?.unsubscribe(); }

  filterByZone(zone: string): void {
    this.zone = zone;
    this.currentPage = 0;
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.produitService.list(this.currentPage, this.pageSize, this.zone || undefined).subscribe({
      next: (res: any) => {
        this.produits = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.produits.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadLists(): void {
    this.modelService.list(0, 999).subscribe({ next: (res: any) => { this.modeles = res?.data?.data || []; } });
    this.fournisseurService.list(0, 999).subscribe({ next: (res: any) => { this.fournisseurs = res?.data?.data || []; } });
  }

  onPageChange(e: { page: number; size: number }): void { this.currentPage = e.page; this.pageSize = e.size; this.loadData(); }

  openModal(item?: Produit): void {
    this.submitted = false;
    this.editingId = item?.id ?? null;
    this.form.reset();
    if (item) {
      this.form.patchValue(item);
    } else {
      this.form.patchValue({ stock: this.zone || '' });
    }
    if (this.zone) {
      this.form.get('stock')?.disable();
    } else {
      this.form.get('stock')?.enable();
    }
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const raw = this.form.getRawValue();
    const data = { ...raw, modelId: Number(raw.modelId), fournisseurId: raw.fournisseurId ? Number(raw.fournisseurId) : undefined };
    const obs = this.editingId
      ? this.produitService.update({ ...data, id: this.editingId })
      : this.produitService.create(data);
    obs.subscribe({
      next: () => { this.snackbar.success(this.editingId ? 'Produit modifié' : 'Produit créé'); this.saving = false; this.closeModal(); this.loadData(); },
      error: () => { this.saving = false; }
    });
  }

  onAction(e: { action: string; row: Produit }): void {
    if (e.action === 'edit') { this.openModal(e.row); }
    else if (e.action === 'delete' && confirm(`Supprimer "${e.row.name}" ?`)) {
      this.produitService.delete(e.row.id).subscribe({ next: () => { this.snackbar.success('Produit supprimé'); this.loadData(); } });
    }
  }
}
