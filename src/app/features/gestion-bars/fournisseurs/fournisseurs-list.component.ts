import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FournisseurService } from '../../../core/services/fournisseur.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { DataTableComponent, DataTableColumn, DataTableAction } from '../../../shared/components/datatable/datatable.component';
import { Fournisseur } from '../../../core/models/entities.model';

@Component({
  selector: 'app-fournisseurs-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './fournisseurs-list.component.html'
})
export class FournisseursListComponent implements OnInit {
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
    { field: 'name', header: 'Nom', sortable: true },
    { field: 'description', header: 'Description', format: v => v || '-' },
    { field: 'createdAt', header: 'Date ajout', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  actions: DataTableAction[] = [
    { label: 'Modifier', icon: 'fas fa-edit', color: 'blue', action: 'edit' },
    { label: 'Supprimer', icon: 'fas fa-trash', color: 'red', action: 'delete' }
  ];

  constructor(
    private fournisseurService: FournisseurService,
    private snackbar: SnackbarService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({ name: ['', Validators.required], description: [''] });
  }

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    this.fournisseurService.list(this.currentPage, this.pageSize).subscribe({
      next: (res: any) => {
        this.fournisseurs = res?.data?.data || [];
        this.totalRecords = res?.data?.pagination?.total ?? this.fournisseurs.length;
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onPageChange(e: { page: number; size: number }): void { this.currentPage = e.page; this.pageSize = e.size; this.loadData(); }

  openModal(item?: Fournisseur): void {
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
      ? this.fournisseurService.update({ ...this.form.value, id: this.editingId })
      : this.fournisseurService.create(this.form.value);
    obs.subscribe({
      next: () => { this.snackbar.success(this.editingId ? 'Fournisseur modifié' : 'Fournisseur créé'); this.saving = false; this.closeModal(); this.loadData(); },
      error: () => { this.saving = false; }
    });
  }

  onAction(e: { action: string; row: Fournisseur }): void {
    if (e.action === 'edit') { this.openModal(e.row); }
    else if (e.action === 'delete' && confirm(`Supprimer "${e.row.name}" ?`)) {
      this.fournisseurService.delete(e.row.id).subscribe({ next: () => { this.snackbar.success('Fournisseur supprimé'); this.loadData(); } });
    }
  }
}
