import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModelCategoryService } from '../../../core/services/model-category.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { ModelCategory } from '../../../core/models/entities.model';

@Component({
  selector: 'app-modeles-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-tags me-2 text-primary"></i>Catégories / Modèles</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Gestion Bars</li>
            <li class="breadcrumb-item active">Catégories</li>
          </ol>
        </nav>
      </div>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="fas fa-plus me-2"></i>Nouvelle catégorie
      </button>
    </div>

    <div class="card-custom">
      <div class="card-header"><i class="fas fa-list me-2"></i>Liste des catégories ({{ totalRecords }})</div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="modeles"
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
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title"><i class="fas fa-tag me-2"></i>{{ editingId ? 'Modifier' : 'Nouvelle' }} catégorie</h5>
            <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Nom *</label>
                <input type="text" class="form-control" formControlName="name" placeholder="Nom de la catégorie"
                  [class.is-invalid]="submitted && form.get('name')?.invalid" />
                <div class="invalid-feedback">Nom requis</div>
              </div>
              <div class="mb-3">
                <label class="form-label">Description</label>
                <textarea class="form-control" formControlName="description" rows="3" placeholder="Description..."></textarea>
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
export class ModelesListComponent implements OnInit {
  modeles: ModelCategory[] = [];
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
    { field: 'name', header: 'Nom', sortable: true },
    { field: 'description', header: 'Description', format: v => v || '-' },
    { field: 'createdAt', header: 'Date ajout', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  constructor(
    private modelService: ModelCategoryService,
    private snackbar: SnackbarService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({ name: ['', Validators.required], description: [''] });
  }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.modelService.list(this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.modeles = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.modeles.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(e: { page: number; size: number }): void { this.currentPage = e.page; this.pageSize = e.size; this.loadData(); }

  openModal(item?: ModelCategory): void {
    this.submitted = false;
    this.editingId = item?.id ?? null;
    this.form.reset();
    if (item) this.form.patchValue(item);
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const obs = this.editingId
      ? this.modelService.update({ ...this.form.value, id: this.editingId })
      : this.modelService.create(this.form.value);
    obs.subscribe({
      next: () => { this.snackbar.success(this.editingId ? 'Catégorie modifiée' : 'Catégorie créée'); this.saving = false; this.closeModal(); this.loadData(); },
      error: () => { this.saving = false; }
    });
  }

  onAction(e: { action: string; row: ModelCategory }): void {
    if (e.action === 'edit') { this.openModal(e.row); }
    else if (e.action === 'delete' && confirm(`Supprimer "${e.row.name}" ?`)) {
      this.modelService.delete(e.row.id).subscribe({ next: () => { this.snackbar.success('Catégorie supprimée'); this.loadData(); } });
    }
  }
}
