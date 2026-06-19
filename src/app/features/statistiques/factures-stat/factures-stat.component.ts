import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-factures-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './factures-stat.component.html'
})
export class FacturesStatComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  totalQte = 0;
  totalMontant = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  totalStockDispo = 0;

  columns: DataTableColumn[] = [
    { field: 'producteur', header: 'Producteur', sortable: true },
    { field: 'stock', header: 'Zone', align: 'center',
      format: v => `<span class="badge ${v === 'R1' ? 'bg-primary' : 'bg-info'}">${v}</span>` },
    { field: 'quantite', header: 'Qté vendue', align: 'center',
      format: v => `<strong>${Number(v ?? 0).toLocaleString('fr-FR')}</strong>` },
    { field: 'montant_vendu', header: 'Montant vendu', align: 'right',
      format: v => `<strong class="text-success">${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'stock_disponible', header: 'Stock actuel', align: 'center',
      format: v => {
        const n = Number(v ?? 0);
        return n <= 0
          ? `<span class="badge bg-danger">${n}</span>`
          : `<span class="badge bg-success">${n}</span>`;
      }}
  ];

  constructor(private factureService: FactureService, private fb: FormBuilder, private pdf: PdfService) {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    this.filterForm = this.fb.group({
      stock: ['R1', Validators.required],
      date_debut: [firstDay, Validators.required],
      date_fin: [today, Validators.required]
    });
  }

  ngOnInit(): void { this.loadStats(); }

  loadStats(): void {
    if (this.filterForm.invalid) return;
    this.loading = true;
    this.searched = true;
    this.currentPage = 0;
    const { stock, date_debut, date_fin } = this.filterForm.value;
    this.factureService.statParProducteur(stock, { date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.totalQte = this.allStats.reduce((acc, r) => acc + Number(r.quantite ?? 0), 0);
        this.totalMontant = this.allStats.reduce((acc, r) => acc + Number(r.montant_vendu ?? 0), 0);
        this.totalStockDispo = this.allStats.reduce((acc, r) => acc + Number(r.stock_disponible ?? 0), 0);
        this.applyPage();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  setZone(zone: string): void {
    this.filterForm.get('stock')?.setValue(zone);
    this.loadStats();
  }

  onPageChange(e: { page: number; size: number }): void {
    this.currentPage = e.page;
    this.pageSize = e.size;
    this.applyPage();
  }

  private applyPage(): void {
    const start = this.currentPage * this.pageSize;
    this.pagedStats = this.allStats.slice(start, start + this.pageSize);
  }

  downloadPdf(): void {
    const { stock, date_debut, date_fin } = this.filterForm.value;
    const range = `Période : ${new Date(date_debut).toLocaleDateString('fr-FR')} → ${new Date(date_fin).toLocaleDateString('fr-FR')} — Zone ${stock}`;
    const cols = [
      { header: 'Producteur', width: '*' },
      { header: 'Zone', width: '45' },
      { header: 'Qté vendue', width: '65' },
      { header: 'Montant vendu', width: '95' },
      { header: 'Stock actuel', width: '65' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const fmtQte = (n: number) => Number(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const rows = this.allStats.map(r => [
      r.producteur || '-',
      r.stock || '-',
      fmtQte(r.quantite ?? 0),
      fmt(r.montant_vendu ?? 0),
      fmtQte(r.stock_disponible ?? 0)
    ]);
    this.pdf.generateStatPdf('Statistiques par producteur', range, cols, rows, `stat-producteur-${stock}-${date_debut}`);
  }
}
