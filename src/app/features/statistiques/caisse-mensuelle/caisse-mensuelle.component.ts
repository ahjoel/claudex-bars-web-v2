import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MouvementService } from '../../../core/services/mouvement.service';
import { PdfService } from '../../../core/services/pdf.service';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/datatable/datatable.component';

@Component({
  selector: 'app-caisse-mensuelle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTableComponent],
  templateUrl: './caisse-mensuelle.component.html'
})
export class CaisseMensuelleComponent implements OnInit {
  allStats: any[] = [];
  pagedStats: any[] = [];
  loading = false;
  searched = false;
  totalEncaisse = 0;
  moyenneParReglement = 0;
  pageSize = 10;
  currentPage = 0;
  filterForm: FormGroup;

  columns: DataTableColumn[] = [
    { field: 'code', header: 'Code facture', format: v => v || '-' },
    { field: 'client', header: 'Client', sortable: true, format: v => v || '-' },
    { field: 'mtrecu', header: 'Montant encaissé', align: 'right',
      format: v => `<strong class="text-success">${Number(v ?? 0).toLocaleString('fr-FR')} FCFA</strong>` },
    { field: 'mtpayer', header: 'Montant à payer', align: 'right',
      format: v => `${Number(v ?? 0).toLocaleString('fr-FR')} FCFA` },
    { field: 'createdAt', header: 'Date règlement',
      format: v => v ? new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }
  ];

  constructor(private mouvementService: MouvementService, private fb: FormBuilder, private pdf: PdfService) {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    this.filterForm = this.fb.group({
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
    const { date_debut, date_fin } = this.filterForm.value;
    this.mouvementService.statReglementMois({ date_debut, date_fin }).subscribe({
      next: (res: any) => {
        this.allStats = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        this.totalEncaisse = this.allStats.reduce((acc, r) => acc + Number(r.mtrecu ?? r.total ?? r.montant ?? 0), 0);
        this.moyenneParReglement = this.allStats.length ? this.totalEncaisse / this.allStats.length : 0;
        this.applyPage();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
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
    const { date_debut, date_fin } = this.filterForm.value;
    const fmtDate = (s: string) => s ? s.split('-').reverse().join('/') : '-';
    const fmtDatetime = (s: string) => s ? s.split('T')[0].split('-').reverse().join('/') : '-';
    const range = `Periode : ${fmtDate(date_debut)} -> ${fmtDate(date_fin)}`;
    const cols = [
      { header: 'Code facture', width: '80' },
      { header: 'Client', width: '*' },
      { header: 'Encaisse', width: '100' },
      { header: 'A payer', width: '100' },
      { header: 'Date', width: '90' }
    ];
    const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
    const rows = this.allStats.map(r => [
      r.code || '-',
      r.client || '-',
      fmt(r.mtrecu ?? 0),
      fmt(r.mtpayer ?? 0),
      fmtDatetime(r.createdAt)
    ]);
    this.pdf.generateStatPdf('Caisse mensuelle — Règlements', range, cols, rows, `caisse-${date_debut}-${date_fin}`);
  }
}
