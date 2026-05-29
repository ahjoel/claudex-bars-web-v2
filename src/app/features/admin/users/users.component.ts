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
  templateUrl: './users.component.html'
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
    if (this.editingId) { pwControl?.setValidators([Validators.minLength(2)]); }
    else { pwControl?.setValidators([Validators.required, Validators.minLength(2)]); }
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
