import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const COMPANY_NAME = 'CLAUDEX — Gestion des Bars';
const COMPANY_ADDRESS = 'Système de gestion de stock et de facturation';

@Injectable({ providedIn: 'root' })
export class PdfService {

  generateStatPdf(
    title: string,
    dateRange: string,
    columns: { header: string; width?: string }[],
    rows: (string | number)[][],
    filename: string
  ): void {
    const isLandscape = columns.length > 5;
    const doc = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });

    const pageW = doc.internal.pageSize.getWidth();
    let y = 30;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(COMPANY_NAME, pageW / 2, y, { align: 'center' });
    y += 22;

    doc.setFontSize(16);
    doc.text(title, pageW / 2, y, { align: 'center' });
    y += 18;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(dateRange, pageW / 2, y, { align: 'center' });
    y += 24;

    autoTable(doc, {
      startY: y,
      head: [columns.map(c => c.header)],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 9 },
      alternateRowStyles: { fillColor: [241, 245, 249] },
      margin: { left: 25, right: 25 },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(COMPANY_ADDRESS, 25, doc.internal.pageSize.getHeight() - 10);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${currentPage} / ${pageCount}`, pageW - 25, doc.internal.pageSize.getHeight() - 10, { align: 'right' });
      }
    });

    doc.save(`${filename}.pdf`);
  }

  fmtCfa(n: number): string {
    return Math.round(n).toLocaleString('fr-FR') + ' FCFA';
  }
}
