import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { MouvementService } from '../../core/services/mouvement.service';
import { ProduitService } from '../../core/services/produit.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../shared/components/datatable/datatable.component';
import { Mouvement, Produit } from '../../core/models/entities.model';

@Component({
  selector: 'app-gestion-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './gestion-stock.component.html'
})
export class GestionStockComponent implements OnInit, OnDestroy {
  private zoneSub?: Subscription;
  mouvements: Mouvement[] = [];
  stockDispo: any[] = [];
  produits: Produit[] = [];
  loading = false;
  saving = false;
  showModal = false;
  submitted = false;
  totalRecords = 0;
  pageSize = 10;
  currentPage = 0;
  activeTab = 'R1';
  modalZone: 'R1' | 'RC' = 'R1';
  editingId: number | null = null;
  dispoZone: 'R1' | 'RC' = 'R1';
  allStockDispo: any[] = [];
  stockDispoPage: any[] = [];
  dispoTotal = 0;
  dispoPage = 0;
  dispoPageSize = 10;
  form: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', format: v => v || '-' },
    { field: 'produit', header: 'Produit', format: (v, row: any) => v || row?.produitCode || row?.produitId || '-' },
    { field: 'types', header: 'Type', align: 'center', format: v => v === 'ADD'
      ? '<span class="badge bg-success">Entrée</span>'
      : '<span class="badge bg-danger">Sortie</span>' },
    { field: 'stock', header: 'Zone', align: 'center', format: v => v ? `<span class="badge bg-secondary">${v}</span>` : '-' },
    { field: 'qte', header: 'Quantité', align: 'center' },
    { field: 'createdAt', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  get dispoColumns(): DataTableColumn[] {
    const stockField = this.dispoZone === 'RC' ? 'stockRC' : 'stockR1';
    const stockColor = this.dispoZone === 'RC' ? 'text-success' : 'text-primary';
    return [
      { field: 'produit', header: 'Produit' },
      { field: 'model', header: 'Modèle' },
      { field: stockField, header: `Stock ${this.dispoZone}`, align: 'center', format: v => `<strong class="${stockColor}">${v ?? 0}</strong>` },
      { field: 'total', header: 'Total', align: 'center', format: v => `<strong>${v ?? 0}</strong>` }
    ];
  }

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  constructor(
    private mouvementService: MouvementService,
    private produitService: ProduitService,
    private snackbar: SnackbarService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      code: ['', Validators.required],
      types: ['', Validators.required],
      stock: ['', Validators.required],
      produitId: ['', Validators.required],
      qte: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    this.produitService.list(0, 999).subscribe({ next: (res: any) => { this.produits = res?.data?.data || []; } });
    this.zoneSub = this.route.queryParamMap.subscribe(params => {
      const zone = params.get('zone');
      this.activeTab = (zone === 'R1' || zone === 'RC') ? zone : 'R1';
      this.currentPage = 0;
      this.loadData();
    });
  }

  ngOnDestroy(): void { this.zoneSub?.unsubscribe(); }

  switchTab(tab: string): void {
    if (tab === 'dispo') this.dispoZone = this.activeTab as 'R1' | 'RC';
    this.activeTab = tab;
    this.currentPage = 0;
    if (tab === 'dispo') this.loadStockDispo();
    else this.loadData();
  }

  loadData(): void {
    this.loading = true;
    const stock = this.activeTab === 'RC' ? 'RC' : 'R1';
    this.mouvementService.list(this.currentPage, this.pageSize, stock).subscribe({
      next: (res: any) => {
        this.mouvements = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.mouvements.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  loadStockDispo(): void {
    this.loading = true;
    forkJoin({
      r1: this.mouvementService.stockDispo('R1', 1, 999),
      rc: this.mouvementService.stockDispo('RC', 1, 999)
    }).subscribe({
      next: ({ r1, rc }) => {
        const r1Data: any[] = (r1 as any)?.data?.data || [];
        const rcData: any[] = (rc as any)?.data?.data || [];
        const map = new Map<number, any>();
        r1Data.forEach(item => map.set(item.id, { ...item, stockR1: item.st_dispo ?? 0, stockRC: 0 }));
        rcData.forEach(item => {
          if (map.has(item.id)) map.get(item.id).stockRC = item.st_dispo ?? 0;
          else map.set(item.id, { ...item, stockR1: 0, stockRC: item.st_dispo ?? 0 });
        });
        this.allStockDispo = Array.from(map.values()).map(item => ({
          ...item, total: (item.stockR1 ?? 0) + (item.stockRC ?? 0)
        }));
        this.dispoTotal = this.allStockDispo.length;
        this.dispoPage = 0;
        this.applyDispoPage();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private applyDispoPage(): void {
    const start = this.dispoPage * this.dispoPageSize;
    this.stockDispoPage = this.allStockDispo.slice(start, start + this.dispoPageSize);
  }

  onDispoPageChange(e: { page: number; size: number }): void {
    this.dispoPage = e.page;
    this.dispoPageSize = e.size;
    this.applyDispoPage();
  }

  onPageChange(e: { page: number; size: number }): void { this.currentPage = e.page; this.pageSize = e.size; this.loadData(); }

  openModal(): void {
    this.submitted = false;
    this.editingId = null;
    this.modalZone = (this.activeTab === 'RC') ? 'RC' : 'R1';
    this.form.reset({ types: 'ADD', stock: this.modalZone });
    this.showModal = true;
  }

  openEditModal(row: Mouvement): void {
    this.submitted = false;
    this.editingId = row.id;
    this.modalZone = (row.stock === 'RC') ? 'RC' : 'R1';
    this.form.reset({
      code: row.code,
      types: row.types,
      stock: row.stock,
      produitId: row.produitId,
      qte: row.qte
    });
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.editingId = null; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const data = { ...this.form.value, produitId: Number(this.form.value.produitId), qte: Number(this.form.value.qte) };
    if (this.editingId) {
      this.mouvementService.update({ ...data, id: this.editingId }).subscribe({
        next: () => { this.snackbar.success('Mouvement modifié'); this.saving = false; this.closeModal(); this.loadData(); },
        error: () => { this.saving = false; }
      });
    } else {
      this.mouvementService.create(data).subscribe({
        next: () => { this.snackbar.success('Mouvement enregistré'); this.saving = false; this.closeModal(); this.loadData(); },
        error: () => { this.saving = false; }
      });
    }
  }

  onAction(e: { action: string; row: Mouvement }): void {
    if (e.action === 'edit') {
      this.openEditModal(e.row);
    } else if (e.action === 'delete' && confirm('Supprimer ce mouvement ?')) {
      this.mouvementService.delete(e.row.id).subscribe({
        next: () => { this.snackbar.success('Mouvement supprimé'); this.loadData(); }
      });
    }
  }
}
