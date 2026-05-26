import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DataTableColumn {
  field: string;
  header: string;
  width?: string;
  sortable?: boolean;
  format?: (value: any, row?: any) => string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableAction {
  label: string;
  icon: string;
  color?: 'blue' | 'red' | 'green' | 'orange';
  action: string;
  hidden?: (row: any) => boolean;
}

@Component({
  selector: 'app-datatable',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="datatable-wrapper">

      <!-- Toolbar: search + page size -->
      <div class="d-flex align-items-center justify-content-between mb-3 gap-2 flex-wrap" *ngIf="showSearch">
        <div class="input-group" style="max-width: 280px;">
          <span class="input-group-text bg-white"><i class="fas fa-search text-muted"></i></span>
          <input type="text" class="form-control" [placeholder]="searchPlaceholder"
            [(ngModel)]="searchValue" (ngModelChange)="onSearch()" />
          <button *ngIf="searchValue" type="button" class="btn btn-outline-secondary px-2" (click)="searchValue=''; onSearch()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="d-flex align-items-center gap-2">
          <ng-content select="[tableActions]"></ng-content>
          <div class="d-flex align-items-center gap-1 text-muted small">
            <span>Lignes&nbsp;:</span>
            <select class="form-select form-select-sm" style="width:75px" [(ngModel)]="currentPageSize" (change)="onSizeChange()">
              <option *ngFor="let s of pageSizeOptions" [value]="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-custom table-hover mb-0">
          <thead>
            <tr>
              <th *ngFor="let col of columns" [style.width]="col.width"
                [class.text-center]="col.align === 'center'" [class.text-end]="col.align === 'right'"
                [class.sortable]="col.sortable" (click)="onSort(col.field)">
                {{ col.header }}
                <i *ngIf="col.sortable" [class]="getSortIcon(col.field)" class="ms-1 small"></i>
              </th>
              <th *ngIf="actions.length" class="text-center" style="width:120px">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td [attr.colspan]="columns.length + (actions.length ? 1 : 0)" class="text-center py-4">
                <div class="spinner-border spinner-border-sm text-primary me-2"></div>
                Chargement...
              </td>
            </tr>
            <tr *ngIf="!loading && filteredData.length === 0">
              <td [attr.colspan]="columns.length + (actions.length ? 1 : 0)" class="text-center py-5 text-muted">
                <i class="fas fa-inbox fa-2x mb-2 d-block"></i>
                {{ searchValue ? 'Aucun résultat pour "' + searchValue + '"' : emptyMessage }}
              </td>
            </tr>
            <tr *ngFor="let row of filteredData">
              <td *ngFor="let col of columns"
                [class.text-center]="col.align === 'center'" [class.text-end]="col.align === 'right'">
                <span [innerHTML]="formatValue(row, col)"></span>
              </td>
              <td *ngIf="actions.length" class="text-center">
                <div class="d-flex justify-content-center gap-1">
                  <ng-container *ngFor="let action of actions">
                    <button *ngIf="!action.hidden || !action.hidden(row)"
                      class="btn btn-sm" [class]="getActionClass(action.color)"
                      [title]="action.label" (click)="onAction(action.action, row)">
                      <i [class]="action.icon"></i>
                    </button>
                  </ng-container>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="d-flex align-items-center justify-content-between mt-3 flex-wrap gap-2"
        *ngIf="showPagination && totalRecords > 0">

        <!-- Info -->
        <p class="text-muted small mb-0">
          {{ rangeStart }}–{{ rangeEnd }} sur <strong>{{ totalRecords }}</strong> résultats
        </p>

        <!-- Pages -->
        <nav aria-label="Pagination">
          <ul class="pagination pagination-sm mb-0">

            <!-- Première page -->
            <li class="page-item" [class.disabled]="!hasPreviousPage">
              <button class="page-link" title="Première page" (click)="goToPage(0)" [disabled]="!hasPreviousPage">
                <i class="fas fa-angle-double-left"></i>
              </button>
            </li>

            <!-- Page précédente -->
            <li class="page-item" [class.disabled]="!hasPreviousPage">
              <button class="page-link" title="Page précédente" (click)="goToPage(currentPage - 1)" [disabled]="!hasPreviousPage">
                <i class="fas fa-chevron-left"></i>
              </button>
            </li>

            <!-- Numéros de pages -->
            <ng-container *ngFor="let p of pageNumbers">
              <li class="page-item disabled" *ngIf="p === -1">
                <span class="page-link text-muted px-2">…</span>
              </li>
              <li class="page-item" [class.active]="p === currentPage" *ngIf="p !== -1">
                <button class="page-link" (click)="goToPage(p)">{{ p + 1 }}</button>
              </li>
            </ng-container>

            <!-- Page suivante -->
            <li class="page-item" [class.disabled]="!hasNextPage">
              <button class="page-link" title="Page suivante" (click)="goToPage(currentPage + 1)" [disabled]="!hasNextPage">
                <i class="fas fa-chevron-right"></i>
              </button>
            </li>

            <!-- Dernière page -->
            <li class="page-item" [class.disabled]="!hasNextPage">
              <button class="page-link" title="Dernière page" (click)="goToPage(totalPages - 1)" [disabled]="!hasNextPage">
                <i class="fas fa-angle-double-right"></i>
              </button>
            </li>

          </ul>
        </nav>
      </div>

    </div>
  `,
  styles: [`
    .sortable { cursor: pointer; user-select: none; }
    .sortable:hover { background-color: #d0e4ff; }
    .datatable-wrapper { width: 100%; }
    .page-link { min-width: 34px; text-align: center; }
  `]
})
export class DataTableComponent implements OnChanges {

  @Input() data: any[] = [];
  @Input() columns: DataTableColumn[] = [];
  @Input() actions: DataTableAction[] = [];
  @Input() loading = false;
  @Input() totalRecords = 0;
  @Input() pageSize = 10;
  @Input() currentPage = 0;
  @Input() showSearch = true;
  @Input() showPagination = true;
  @Input() emptyMessage = 'Aucune donnée disponible';
  @Input() searchPlaceholder = 'Rechercher...';

  @Output() rowAction = new EventEmitter<{ action: string; row: any }>();
  @Output() pageChange = new EventEmitter<{ page: number; size: number }>();
  @Output() search = new EventEmitter<string>();

  searchValue = '';
  sortField = '';
  sortOrder: 'asc' | 'desc' = 'asc';
  currentPageSize = 10;
  pageSizeOptions = [10, 20, 50, 100];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pageSize']) {
      this.currentPageSize = this.pageSize;
    }
    if (changes['data']) {
      this.searchValue = '';
    }
  }

  get filteredData(): any[] {
    const term = this.searchValue.trim().toLowerCase();
    if (!term) return this.data;
    return this.data.filter(row =>
      this.columns.some(col => {
        const val = row[col.field];
        return val != null && String(val).toLowerCase().includes(term);
      })
    );
  }

  onSearch(): void { this.search.emit(this.searchValue); }

  onSort(field: string): void {
    const col = this.columns.find(c => c.field === field);
    if (!col?.sortable) return;
    this.sortOrder = this.sortField === field && this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.sortField = field;
  }

  onAction(action: string, row: any): void { this.rowAction.emit({ action, row }); }

  onSizeChange(): void {
    this.pageChange.emit({ page: 0, size: Number(this.currentPageSize) });
  }

  goToPage(newPage: number): void {
    if (newPage >= 0 && newPage < this.totalPages && newPage !== this.currentPage) {
      this.pageChange.emit({ page: newPage, size: this.currentPageSize });
    }
  }

  formatValue(row: any, col: DataTableColumn): string {
    const value = row[col.field];
    return col.format ? col.format(value, row) : (value ?? '-');
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fas fa-sort text-muted';
    return this.sortOrder === 'asc' ? 'fas fa-sort-up text-primary' : 'fas fa-sort-down text-primary';
  }

  getActionClass(color?: string): string {
    const map: Record<string, string> = {
      blue: 'btn-outline-primary',
      red: 'btn-outline-danger',
      green: 'btn-outline-success',
      orange: 'btn-outline-warning'
    };
    return map[color || 'blue'] || 'btn-outline-primary';
  }

  get totalPages(): number { return Math.max(1, Math.ceil(this.totalRecords / this.currentPageSize)); }
  get hasNextPage(): boolean { return this.currentPage < this.totalPages - 1; }
  get hasPreviousPage(): boolean { return this.currentPage > 0; }
  get rangeStart(): number { return this.totalRecords === 0 ? 0 : this.currentPage * this.currentPageSize + 1; }
  get rangeEnd(): number { return Math.min((this.currentPage + 1) * this.currentPageSize, this.totalRecords); }

  /** Génère les numéros de page avec ellipsis (-1) */
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);

    const pages: number[] = [];
    // Toujours la première
    pages.push(0);

    const leftBound = Math.max(1, current - 1);
    const rightBound = Math.min(total - 2, current + 1);

    if (leftBound > 1) pages.push(-1); // ellipsis gauche
    for (let i = leftBound; i <= rightBound; i++) pages.push(i);
    if (rightBound < total - 2) pages.push(-1); // ellipsis droite

    // Toujours la dernière
    pages.push(total - 1);
    return pages;
  }
}
