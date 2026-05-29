import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-impayes-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './impayes-stat.component.html'
})
export class ImpayesStatComponent implements OnInit {
  allStats: any[] = [];
  filteredStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  activeZone = '';
  totalImpaye = 0;
  r1Count = 0;
  rcCount = 0;
  pageSize = 10;
  currentPage = 0;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '110px' },
    { field: 'client', header: 'Client', sortable: true },
    { field: 'stock', header: 'Zone', align: 'center',
      format: v => {
        if (!v) return '-';
        const zones = String(v).split('/');
        return zones.map(z => `<span class="badge ${z.trim() === 'R1' ? 'bg-primary' : 'bg-info'} me-1">${z.trim()}</span>`).join('');
      }},
    { field: 'nbproduit', header: 'Nb produits', align: 'center' },
    { field: 'totalfacture', header: 'Montant HT', align: 'right',
      format: v => `<strong class="text-danger">${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'createdAt', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' }
  ];

  constructor(private factureService: FactureService, private pdf: PdfService) {}

  ngOnInit(): void { this.loadStats(); }

  loadStats(): void {
    this.loading = true;
    this.factureService.list(0, 9999).subscribe({
      next: (res: any) => {
        const all: any[] = res?.data?.data || [];
        this.allStats = all.filter(f => f.statut === 'impayée');
        this.r1Count = this.allStats.filter(f => String(f.stock ?? '').includes('R1')).length;
        this.rcCount = this.allStats.filter(f => String(f.stock ?? '').includes('RC')).length;
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setZone(zone: string): void {
    this.activeZone = zone;
    this.currentPage = 0;
    this.applyFilter();
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.applyPage();
  }

  private applyFilter(): void {
    this.filteredStats = this.activeZone
      ? this.allStats.filter(f => String(f.stock ?? '').includes(this.activeZone))
      : this.allStats;
    this.totalImpaye = this.filteredStats.reduce((acc, f) => acc + Number(f.totalfacture ?? 0), 0);
    this.currentPage = 0;
    this.applyPage();
  }

  private applyPage(): void {
    const start = this.currentPage * this.pageSize;
    this.pagedStats = this.filteredStats.slice(start, start + this.pageSize);
  }

  downloadPdf(): void {
    const zone = this.activeZone ? `Zone ${this.activeZone}` : 'Toutes zones';
    const cols = [
      { header: 'Code', width: '70' },
      { header: 'Client', width: '*' },
      { header: 'Zone', width: '50' },
      { header: 'Nb produits', width: '60' },
      { header: 'Montant HT', width: '100' },
      { header: 'Date', width: '65' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const rows = this.filteredStats.map(r => [
      r.code || '-',
      r.client || '-',
      r.stock || '-',
      Number(r.nbproduit ?? 0),
      fmt(r.totalfacture ?? 0),
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('fr-FR') : '-'
    ]);
    this.pdf.generateStatPdf('Factures impayées', zone, cols, rows, `impayes-${this.activeZone || 'all'}`);
  }
}
