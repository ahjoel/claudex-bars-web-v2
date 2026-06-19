import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { MouvementService } from '../../../core/services/mouvement.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-stock-stat',
  standalone: true,
  imports: [CommonModule, DataTableComponent],
  templateUrl: './stock-stat.component.html'
})
export class StockStatComponent implements OnInit {
  allData: any[] = [];
  filteredData: any[] = [];
  pagedData: any[] = [];
  loading = false;
  pageSize = 10;
  currentPage = 0;
  activeZone: 'R1' | 'RC' | 'tous' = 'tous';

  get columns(): DataTableColumn[] {
    if (this.activeZone === 'R1') {
      return [
        { field: 'produit', header: 'Produit', sortable: true },
        { field: 'model', header: 'Modèle' },
        { field: 'stockR1', header: 'Stock R1', align: 'center',
          format: v => {
            const n = Number(v ?? 0);
            return n <= 0 ? `<span class="badge bg-danger">${n}</span>` : `<span class="badge bg-primary">${n}</span>`;
          }}
      ];
    }
    if (this.activeZone === 'RC') {
      return [
        { field: 'produit', header: 'Produit', sortable: true },
        { field: 'model', header: 'Modèle' },
        { field: 'stockRC', header: 'Stock RC', align: 'center',
          format: v => {
            const n = Number(v ?? 0);
            return n <= 0 ? `<span class="badge bg-danger">${n}</span>` : `<span class="badge bg-info">${n}</span>`;
          }}
      ];
    }
    return [
      { field: 'produit', header: 'Produit', sortable: true },
      { field: 'model', header: 'Modèle' },
      { field: 'stockR1', header: 'Stock R1', align: 'center',
        format: v => {
          const n = Number(v ?? 0);
          return n <= 0 ? `<span class="badge bg-danger">${n}</span>` : `<span class="badge bg-primary">${n}</span>`;
        }},
      { field: 'stockRC', header: 'Stock RC', align: 'center',
        format: v => {
          const n = Number(v ?? 0);
          return n <= 0 ? `<span class="badge bg-danger">${n}</span>` : `<span class="badge bg-info">${n}</span>`;
        }},
      { field: 'total', header: 'Total', align: 'center',
        format: v => {
          const n = Number(v ?? 0);
          return `<strong class="${n <= 0 ? 'text-danger' : ''}">${n}</strong>`;
        }}
    ];
  }

  constructor(private mouvementService: MouvementService, private pdf: PdfService) {}

  ngOnInit(): void { this.loadData(); }

  loadData(): void {
    this.loading = true;
    forkJoin({
      r1: this.mouvementService.stockDispo('R1'),
      rc: this.mouvementService.stockDispo('RC')
    }).subscribe({
      next: ({ r1, rc }) => {
        const r1Data: any[] = (r1 as any)?.data?.data || [];
        const rcData: any[] = (rc as any)?.data?.data || [];
        const map = new Map<number, any>();
        r1Data.forEach(item => map.set(item.id, {
          produit: item.produit, model: item.model,
          stockR1: Number(item.st_dispo ?? 0), stockRC: 0
        }));
        rcData.forEach(item => {
          if (map.has(item.id)) {
            map.get(item.id).stockRC = Number(item.st_dispo ?? 0);
          } else {
            map.set(item.id, { produit: item.produit, model: item.model, stockR1: 0, stockRC: Number(item.st_dispo ?? 0) });
          }
        });
        this.allData = Array.from(map.values()).map(item => ({
          ...item, total: item.stockR1 + item.stockRC
        }));
        this.currentPage = 0;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setZone(zone: 'R1' | 'RC' | 'tous'): void {
    this.activeZone = zone;
    this.currentPage = 0;
    this.applyFilter();
  }

  private applyFilter(): void {
    if (this.activeZone === 'R1') {
      this.filteredData = this.allData.filter(item => item.stockR1 > 0);
    } else if (this.activeZone === 'RC') {
      this.filteredData = this.allData.filter(item => item.stockRC > 0);
    } else {
      this.filteredData = [...this.allData];
    }
    this.applyPage();
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.applyPage();
  }

  private applyPage(): void {
    const start = this.currentPage * this.pageSize;
    this.pagedData = this.filteredData.slice(start, start + this.pageSize);
  }

  downloadPdf(): void {
    const today = new Date().toLocaleDateString('fr-FR');
    const cols = this.activeZone === 'R1'
      ? [{ header: 'Produit', width: '*' }, { header: 'Modèle', width: '100' }, { header: 'Stock R1', width: '70' }]
      : this.activeZone === 'RC'
        ? [{ header: 'Produit', width: '*' }, { header: 'Modèle', width: '100' }, { header: 'Stock RC', width: '70' }]
        : [{ header: 'Produit', width: '*' }, { header: 'Modèle', width: '100' }, { header: 'Stock R1', width: '70' }, { header: 'Stock RC', width: '70' }, { header: 'Total', width: '60' }];
    const zoneLabel = this.activeZone === 'tous' ? 'Toutes zones' : `Zone ${this.activeZone}`;
    const rows = this.filteredData.map(r => {
      if (this.activeZone === 'R1') return [r.produit || '-', r.model || '-', r.stockR1 ?? 0];
      if (this.activeZone === 'RC') return [r.produit || '-', r.model || '-', r.stockRC ?? 0];
      return [r.produit || '-', r.model || '-', r.stockR1 ?? 0, r.stockRC ?? 0, r.total ?? 0];
    });
    this.pdf.generateStatPdf(`Inventaire du stock — ${zoneLabel}`, `Au ${today}`, cols, rows, `inventaire-stock-${this.activeZone}-${today.replace(/\//g, '-')}`);
  }
}
