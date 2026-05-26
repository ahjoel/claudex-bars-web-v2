import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { AppUser } from '../../../core/models/entities.model';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-user-cog me-2 text-primary"></i>Utilisateurs</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Administration</li>
            <li class="breadcrumb-item active">Utilisateurs</li>
          </ol>
        </nav>
      </div>
      <button class="btn btn-primary" (click)="openModal()">
        <i class="fas fa-user-plus me-2"></i>Nouvel utilisateur
      </button>
    </div>

    <div class="card-custom">
      <div class="card-header"><i class="fas fa-users me-2"></i>Liste des utilisateurs ({{ totalRecords }})</div>
      <div class="card-body p-0">
        <div class="p-3">
          <app-datatable
            [data]="users"
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
            <h5 class="modal-title"><i class="fas fa-user me-2"></i>{{ editingId ? 'Modifier' : 'Nouvel' }} utilisateur</h5>
            <button type="button" class="btn-close btn-close-white" (click)="closeModal()"></button>
          </div>
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="modal-body">
              <div class="row g-3">
                <div class="col-md-6">
                  <label class="form-label">Nom d'utilisateur *</label>
                  <input type="text" class="form-control" formControlName="username" placeholder="username"
                    [class.is-invalid]="submitted && form.get('username')?.invalid" />
                  <div class="invalid-feedback">Requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Email *</label>
                  <input type="email" class="form-control" formControlName="email" placeholder="email@example.com"
                    [class.is-invalid]="submitted && form.get('email')?.invalid" />
                  <div class="invalid-feedback">Email valide requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Prénom *</label>
                  <input type="text" class="form-control" formControlName="firstname" placeholder="Prénom"
                    [class.is-invalid]="submitted && form.get('firstname')?.invalid" />
                  <div class="invalid-feedback">Requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Nom *</label>
                  <input type="text" class="form-control" formControlName="lastname" placeholder="Nom"
                    [class.is-invalid]="submitted && form.get('lastname')?.invalid" />
                  <div class="invalid-feedback">Requis</div>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Profil</label>
                  <select class="form-select" formControlName="profile">
                    <option value="">Sélectionner...</option>
                    <option value="admin">Administrateur</option>
                    <option value="manager">Manager</option>
                    <option value="caissier">Caissier</option>
                    <option value="vendeur">Vendeur</option>
                  </select>
                </div>
                <div class="col-md-6">
                  <label class="form-label">Zone</label>
                  <select class="form-select" formControlName="zone">
                    <option value="">Toutes zones</option>
                    <option value="R1">Zone R1</option>
                    <option value="RC">Zone RC</option>
                  </select>
                </div>
                <div class="col-12" *ngIf="!editingId">
                  <label class="form-label">Mot de passe *</label>
                  <input type="password" class="form-control" formControlName="password" placeholder="Mot de passe"
                    [class.is-invalid]="submitted && form.get('password')?.invalid" />
                  <div class="invalid-feedback">Requis (min. 6 caractères)</div>
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
export class UsersComponent implements OnInit {
  users: AppUser[] = [];
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
    { field: 'username', header: 'Utilisateur', sortable: true },
    { field: 'firstname', header: 'Prénom', format: v => v || '-' },
    { field: 'lastname', header: 'Nom', format: v => v || '-' },
    { field: 'email', header: 'Email' },
    { field: 'profile', header: 'Profil', format: v => v ? `<span class="badge bg-primary">${v}</span>` : '-' },
    { field: 'zone', header: 'Zone', format: v => v ? `<span class="badge bg-secondary">${v}</span>` : '-' }
  ];

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  constructor(
    private userService: UserService,
    private snackbar: SnackbarService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstname: ['', Validators.required],
      lastname: ['', Validators.required],
      profile: [''],
      zone: [''],
      password: ['']
    });
  }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.userService.list(this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.users = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.users.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(e: { page: number; size: number }): void { this.currentPage = e.page; this.loadData(); }

  openModal(user?: AppUser): void {
    this.submitted = false;
    this.editingId = user?.id ?? null;
    this.form.reset();
    if (user) this.form.patchValue(user);
    // Mot de passe obligatoire seulement à la création
    const pwControl = this.form.get('password');
    if (this.editingId) { pwControl?.clearValidators(); }
    else { pwControl?.setValidators([Validators.required, Validators.minLength(6)]); }
    pwControl?.updateValueAndValidity();
    this.showModal = true;
  }

  closeModal(): void { this.showModal = false; }

  onSubmit(): void {
    this.submitted = true;
    if (this.form.invalid) return;
    this.saving = true;
    const data = { ...this.form.value };
    if (this.editingId && !data.password) delete data.password;
    const obs = this.editingId
      ? this.userService.update({ ...data, id: this.editingId })
      : this.userService.create(data);
    obs.subscribe({
      next: () => { this.snackbar.success(this.editingId ? 'Utilisateur modifié' : 'Utilisateur créé'); this.saving = false; this.closeModal(); this.loadData(); },
      error: () => { this.saving = false; }
    });
  }

  onAction(e: { action: string; row: AppUser }): void {
    if (e.action === 'edit') { this.openModal(e.row); }
    else if (e.action === 'delete' && confirm(`Supprimer l'utilisateur "${e.row.username}" ?`)) {
      this.userService.delete(e.row.id).subscribe({ next: () => { this.snackbar.success('Utilisateur supprimé'); this.loadData(); } });
    }
  }
}
