import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClientService } from '../../core/services/client.service';
import { ProduitService } from '../../core/services/produit.service';
import { FactureService } from '../../core/services/facture.service';
import { MouvementService } from '../../core/services/mouvement.service';
import { ReglementService } from '../../core/services/reglement.service';

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  bg: string;
  link: string;
  description: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styles: []
})
export class DashboardComponent implements OnInit {
  stats: StatCard[] = [];
  loading = true;
  today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  reglTab: 'R1' | 'RC' = 'R1';
  reglLoading = false;
  reglementsR1: any[] = [];
  reglementsRC: any[] = [];
  get currentReglements(): any[] {
    return this.reglTab === 'R1' ? this.reglementsR1 : this.reglementsRC;
  }

  constructor(
    private clientService: ClientService,
    private produitService: ProduitService,
    private factureService: FactureService,
    private mouvementService: MouvementService,
    private reglementService: ReglementService
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadReglements();
  }

  loadReglements(): void {
    this.reglLoading = true;
    Promise.allSettled([
      this.reglementService.list(0, 10, 'R1').toPromise(),
      this.reglementService.list(0, 10, 'RC').toPromise()
    ]).then(([r1Res, rcRes]) => {
      this.reglementsR1 = r1Res.status === 'fulfilled' ? ((r1Res.value as any)?.data?.data ?? []) : [];
      this.reglementsRC = rcRes.status === 'fulfilled' ? ((rcRes.value as any)?.data?.data ?? []) : [];
      this.reglLoading = false;
    });
  }

  switchReglTab(zone: 'R1' | 'RC'): void {
    this.reglTab = zone;
  }

  loadStats(): void {
    const today = new Date().toISOString().split('T')[0];
    this.loading = true;
    Promise.allSettled([
      this.clientService.list(0, 1).toPromise(),
      this.produitService.list(0, 1).toPromise(),
      this.factureService.list(0, 9999, undefined, today, today).toPromise()
    ]).then(([clientsRes, produitsRes, facturesRes]) => {
      const clients  = clientsRes.status  === 'fulfilled' ? clientsRes.value  : null;
      const produits = produitsRes.status === 'fulfilled' ? produitsRes.value : null;
      const facturesDuJour: any[] = (facturesRes.status === 'fulfilled'
        ? (facturesRes.value as any)?.data?.data
        : null) ?? [];

      const nbFactures = facturesDuJour.length;
      const montantDuJour = facturesDuJour.reduce((acc, f) => acc + Number(f.totalfacture ?? 0), 0);
      const nbImpayes = facturesDuJour.filter(f => f.statut === 'impayée').length;

      this.stats = [
        {
          label: 'Clients',
          value: (clients as any)?.data?.pagination?.total ?? (clients as any)?.data?.data?.length ?? 0,
          icon: 'fas fa-users',
          color: '#0d6efd',
          bg: '#e7f1ff',
          link: '/gestion-bars/clients',
          description: 'Total clients enregistrés'
        },
        {
          label: 'Produits',
          value: (produits as any)?.data?.pagination?.total ?? (produits as any)?.data?.data?.length ?? 0,
          icon: 'fas fa-box',
          color: '#198754',
          bg: '#d1e7dd',
          link: '/gestion-bars/produits',
          description: 'Produits dans le catalogue'
        },
        {
          label: 'Factures du jour',
          value: nbFactures,
          icon: 'fas fa-file-invoice',
          color: '#f59e0b',
          bg: '#fff3cd',
          link: '/gestion-bars/factures',
          description: "Factures émises aujourd'hui"
        },
        {
          label: 'Montant du jour',
          value: montantDuJour.toLocaleString('fr-FR') + ' FCFA',
          icon: 'fas fa-coins',
          color: '#6366f1',
          bg: '#ede9fe',
          link: '/gestion-bars/factures',
          description: "Total facturé aujourd'hui"
        },
        {
          label: 'Impayées du jour',
          value: nbImpayes,
          icon: 'fas fa-exclamation-triangle',
          color: '#dc3545',
          bg: '#f8d7da',
          link: '/statistiques/impayes',
          description: "Factures non réglées aujourd'hui"
        }
      ];
      this.loading = false;
    });
  }
}
