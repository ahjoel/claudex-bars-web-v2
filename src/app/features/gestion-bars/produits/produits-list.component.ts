import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription, forkJoin, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProduitService } from '../../../core/services/produit.service';
import { MouvementService } from '../../../core/services/mouvement.service';
import { ModelCategoryService } from '../../../core/services/model-category.service';
import { FournisseurService } from '../../../core/services/fournisseur.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Produit, ModelCategory, Fournisseur } from '../../../core/models/entities.model';

@Component({
  selector: 'app-produits-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './produits-list.component.html'
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

  private stockMap = new Map<number, number>();

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '100px' },
    { field: 'name', header: 'Nom', sortable: true },
    { field: 'stock', header: 'Zone', align: 'center', width: '80px',
      format: v => v === 'R1'
        ? `<span class="badge bg-primary">R1</span>`
        : `<span class="badge bg-success">RC</span>` },
    { field: 'pv', header: 'Prix vente', align: 'right', format: v => `<strong>${Number(v).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'st_dispo', header: 'Stock dispo', align: 'center',
      format: (v, row: any) => {
        const val = Number(v ?? 0);
        const seuil = Number(row?.stock_min ?? 0);
        if (val <= 0) return `<span class="badge bg-danger">Épuisé</span>`;
        if (seuil > 0 && val <= seuil) return `<span class="text-warning fw-bold">${val}</span>`;
        return `<span class="text-success fw-bold">${val}</span>`;
      }},
    { field: 'stock_min', header: 'Seuil min', align: 'center', format: v => v ?? '-' },
    { field: 'createdAt', header: 'Ajouté le', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  zone = '';

  constructor(
    private produitService: ProduitService,
    private mouvementService: MouvementService,
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
    const zones = this.zone ? [this.zone] : ['R1', 'RC'];
    forkJoin({
      produits: this.produitService.list(this.currentPage, this.pageSize, this.zone || undefined),
      ...Object.fromEntries(zones.map(z => [z, this.mouvementService.stockDispo(z, 1, 999)]))
    }).subscribe({
      next: (res: any) => {
        this.stockMap.clear();
        zones.forEach(z => {
          const items: any[] = res[z]?.data?.data || [];
          items.forEach(item => { if (item.id) this.stockMap.set(item.id, item.st_dispo ?? 0); });
        });
        this.produits = (res.produits?.data?.data || []).map((p: any) => ({
          ...p, st_dispo: this.stockMap.get(p.id) ?? 0
        }));
        this.totalRecords = res.produits?.data?.pagination?.total ?? this.produits.length;
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
