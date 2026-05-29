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
  templateUrl: './clients-list.component.html'
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
