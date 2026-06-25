import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FactureService } from '../../../core/services/facture.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-archivees-stat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './archivees-stat.component.html'
})
export class ArchiveesStatComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  payees = 0;
  impayees = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code', width: '110px' },
    { field: 'client', header: 'Client', sortable: true },
    { field: 'date_creation', header: 'Date', format: v => v ? new Date(v).toLocaleDateString('fr-FR') : '-' },
    { field: 'stock', header: 'Zone', align: 'center',
      format: v => `<span class="badge ${v === 'R1' ? 'bg-primary' : 'bg-info'}">${v ?? '-'}</span>` },
    { field: 'nbproduit', header: 'Nb produits', align: 'center' },
    { field: 'taxe', header: 'Taxe', align: 'center', format: v => `${v ?? 0} %` },
    { field: 'totalfacture', header: 'Total', align: 'right',
      format: v => `<strong>${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'statut', header: 'Statut', align: 'center',
      format: v => v === 'payée'
        ? `<span class="badge bg-success">Payée</span>`
        : `<span class="badge bg-danger">Impayée</span>` }
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
    this.factureService.statArchivage(stock, { date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.payees = this.allStats.filter(r => r.statut === 'payée').length;
        this.impayees = this.allStats.filter(r => r.statut === 'impayée').length;
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
    const fmtDatetime = (s: string) => s ? s.split('T')[0].split('-').reverse().join('/') : '-';
    const range = `Periode : ${fmtDate(date_debut)} -> ${fmtDate(date_fin)} - Zone ${stock}`;
    const cols = [
      { header: 'Code', width: '70' },
      { header: 'Client', width: '*' },
      { header: 'Date', width: '65' },
      { header: 'Zone', width: '40' },
      { header: 'Nb produits', width: '60' },
      { header: 'Total', width: '90' },
      { header: 'Statut', width: '55' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const rows = this.allStats.map(r => [
      r.code || '-',
      r.client || '-',
      fmtDatetime(r.date_creation),
      r.stock || '-',
      Number(r.nbproduit ?? 0),
      fmt(r.totalfacture ?? 0),
      r.statut || '-'
    ]);
    this.pdf.generateStatPdf('Factures archivées', range, cols, rows, `archivees-${stock}-${date_debut}`);
  }
}
