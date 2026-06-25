import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-ventes-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './ventes-stat.component.html'
})
export class VentesStatComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  totalEntrees = 0;
  totalVendus = 0;
  totalRestant = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'produit', header: 'Produit', sortable: true },
    { field: 'model', header: 'Modèle' },
    { field: 'fournisseur', header: 'Fournisseur' },
    { field: 'qte_stock', header: 'Stock initial', align: 'center',
      format: v => `${Number(v ?? 0).toLocaleString('fr-FR')}` },
    { field: 'qte_stock_entree', header: 'Entrées', align: 'center',
      format: v => `<span class="text-success fw-bold">+${Number(v ?? 0).toLocaleString('fr-FR')}</span>` },
    { field: 'qte_stock_vendu', header: 'Vendus', align: 'center',
      format: v => `<span class="text-danger fw-bold">-${Number(v ?? 0).toLocaleString('fr-FR')}</span>` },
    { field: 'qte_stock_restant', header: 'Stock restant', align: 'center',
      format: (v, row: any) => {
        const val = Number(v ?? 0);
        const seuil = Number(row?.seuil ?? 0);
        const cls = val <= 0 ? 'text-danger' : (seuil > 0 && val <= seuil ? 'text-warning' : 'text-success');
        return `<strong class="${cls}">${val.toLocaleString('fr-FR')}</strong>`;
      }},
    { field: 'seuil', header: 'Seuil min', align: 'center',
      format: v => `<span class="text-muted">${Number(v ?? 0).toLocaleString('fr-FR')}</span>` }
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
    this.factureService.statGeneral(stock, { date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.totalEntrees = this.allStats.reduce((acc, r) => acc + Number(r.qte_stock_entree ?? 0), 0);
        this.totalVendus = this.allStats.reduce((acc, r) => acc + Number(r.qte_stock_vendu ?? 0), 0);
        this.totalRestant = this.allStats.reduce((acc, r) => acc + Number(r.qte_stock_restant ?? 0), 0);
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
    const fmtDate = (s: string) => s ? s.split('-').reverse().join('/') : '-';
    const range = `Periode : ${fmtDate(date_debut)} -> ${fmtDate(date_fin)} - Zone ${stock}`;
    const cols = [
      { header: 'Produit', width: '*' },
      { header: 'Modèle', width: '80' },
      { header: 'Fournisseur', width: '80' },
      { header: 'Stk initial', width: '55' },
      { header: 'Entrées', width: '50' },
      { header: 'Vendus', width: '50' },
      { header: 'Restant', width: '50' },
      { header: 'Seuil', width: '45' }
    ];
    const rows = this.allStats.map(r => [
      r.produit || '-',
      r.model || '-',
      r.fournisseur || '-',
      Number(r.qte_stock ?? 0),
      Number(r.qte_stock_entree ?? 0),
      Number(r.qte_stock_vendu ?? 0),
      Number(r.qte_stock_restant ?? 0),
      Number(r.seuil ?? 0)
    ]);
    this.pdf.generateStatPdf('Statistiques des ventes', range, cols, rows, `ventes-${stock}-${date_debut}`);
  }
}
