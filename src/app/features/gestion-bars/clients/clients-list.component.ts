import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClientService } from '../../../core/services/client.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Client } from '../../../core/models/entities.model';

@Component({
  selector: 'app-clients-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-users me-2 text-primary"></i>Clients</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Gestion Bars</li>
            <li class="breadcrumb-item active">Clients</li>
          </ol>
        </nav>
      </div>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="fas fa-plus me-2"></i>Nouveau client
      </button>
    </div>

    <div class="card-custom">
      <div class="card-header d-flex align-items-center justify-content-between">
        <span><i class="fas fa-list me-2"></i>Liste des clients ({{ totalRecords }})</span>
      </div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="clients"
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

    <!-- Modal -->
    <div class="modal fade show d-block" tabindex="-1" *ngIf="showModal" style="background:rgba(0,0,0,0.5)">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header modal-header-custom">
            <h5 class="modal-title">
              <i class="fas fa-user me-2"></i>{{ editingId ? 'Modifier' : 'Nouveau' }} client
            </h5>
            <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Nom *</label>
                  <input type="text" class="form-control" formControlName="name" placeholder="Nom du client"
                    [class.is-invalid]="submitted && form.get('name')?.invalid" />
                  <div class="invalid-feedback">Nom requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Téléphone</label>
                  <input type="text" class="form-control" formControlName="tel" placeholder="Numéro de téléphone" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" formControlName="mail" placeholder="Email du client" />
                </div>
                <div class="col-md-6">
                  <label class="form-label">Type</label>
                  <select class="form-select" formControlName="type">
                    <option value="">Sélectionner...</option>
                    <option value="particulier">Particulier</option>
                    <option value="entreprise">Entreprise</option>
                    <option value="grossiste">Grossiste</option>
                  </select>
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
export class ClientsListComponent implements OnInit {
  clients: Client[] = [];
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
    { field: 'tel', header: 'Téléphone', format: v => v || '-' },
    { field: 'mail', header: 'Email', format: v => v || '-' },
    { field: 'type', header: 'Type', format: v => v ? `<span class="badge bg-secondary">${v}</span>` : '-' },
    { field: 'createdAt', header: 'Date ajout', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  constructor(
    private clientService: ClientService,
    private snackbar: SnackbarService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      tel: [''],
      mail: [''],
      type: [''],
      description: ['']
    });
  }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.clientService.list(this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.clients = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.clients.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.loadData();
  }

  openModal(client?: Client): void {
    this.submitted = false;
    this.editingId = client?.id ?? null;
    this.form.reset();
    if (client) this.form.patchValue(client);
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; this.editingId = null; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const data = this.form.value;
    const obs = this.editingId
      ? this.clientService.update({ ...data, id: this.editingId })
      : this.clientService.create(data);

    obs.subscribe({
      next: () => {
        this.snackbar.success(this.editingId ? 'Client modifié avec succès' : 'Client créé avec succès');
        this.saving = false;
        this.closeModal();
        this.loadData();
      },
      error: () => { this.saving = false; }
    });
  }

  onAction(e: { action: string; row: Client }): void {
    if (e.action === 'edit') {
      this.openModal(e.row);
    } else if (e.action === 'delete') {
      if (confirm(`Supprimer le client "${e.row.name}" ?`)) {
        this.clientService.delete(e.row.id).subscribe({
          next: () => { this.snackbar.success('Client supprimé'); this.loadData(); },
          error: () => {}
        });
      }
    }
  }
}
