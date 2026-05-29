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
  templateUrl: './datatable.component.html',
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
