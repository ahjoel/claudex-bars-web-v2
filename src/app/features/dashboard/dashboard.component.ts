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
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-tachometer-alt me-2 text-primary"></i>Tableau de bord</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item active">Accueil</li>
          </ol>
        </nav>
      </div>
      <span class="text-muted small">{{ today }}</span>
    </div>

    <!-- Stat Cards -->
    <div class="row g-3 mb-4">
      <div class="col-12 col-sm-6 col-xl-3" *ngFor="let stat of stats">
        <a [routerLink]="stat.link" class="text-decoration-none">
          <div class="stat-card h-100" [style.border-left-color]="stat.color">
            <div class="d-flex align-items-start justify-content-between">
              <div>
                <div class="stat-number" [style.color]="stat.color">{{ stat.value }}</div>
                <div class="stat-label">{{ stat.label }}</div>
                <div class="text-muted mt-1" style="font-size:0.78rem;">{{ stat.description }}</div>
              </div>
              <div class="stat-icon" [style.color]="stat.color">
                <i [class]="stat.icon + ' fa-2x'" [style.opacity]="0.25"></i>
              </div>
            </div>
          </div>
        </a>
      </div>
    </div>

    <!-- Loading -->
    <div class="text-center py-5" *ngIf="loading">
      <div class="spinner-border text-primary"></div>
      <p class="text-muted mt-2">Chargement des données...</p>
    </div>

    <!-- Derniers Règlements -->
    <div class="card-custom mb-4" *ngIf="!loading">
      <div class="card-header d-flex align-items-center justify-content-between">
        <span><i class="fas fa-money-bill-wave me-2"></i>Derniers règlements</span>
        <a routerLink="/gestion-bars/reglements" class="btn btn-sm btn-outline-primary">Voir tout</a>
      </div>
      <div class="card-body p-0">
        <!-- Tabs -->
        <ul class="nav nav-tabs px-3 pt-2">
          <li class="nav-item">
            <button class="nav-link" [class.active]="reglTab === 'R1'" (click)="switchReglTab('R1')">
              <i class="fas fa-warehouse me-1"></i>Zone R1
            </button>
          </li>
          <li class="nav-item">
            <button class="nav-link" [class.active]="reglTab === 'RC'" (click)="switchReglTab('RC')">
              <i class="fas fa-boxes me-1"></i>Zone RC
            </button>
          </li>
        </ul>

        <!-- Chargement règlements -->
        <div class="text-center py-4" *ngIf="reglLoading">
          <div class="spinner-border spinner-border-sm text-primary"></div>
        </div>

        <!-- Table règlements -->
        <div class="table-responsive" *ngIf="!reglLoading">
          <table class="table table-hover mb-0" style="font-size:0.875rem">
            <thead class="table-light">
              <tr>
                <th class="ps-3">Client</th>
                <th>Facture</th>
                <th class="text-end">Montant reçu</th>
                <th class="text-end pe-3">Montant payé</th>
                <th>Date</th>
                <th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of currentReglements">
                <td class="ps-3 fw-semibold">{{ r.client || '-' }}</td>
                <td class="text-muted">{{ r.codeFacture || '-' }}</td>
                <td class="text-end text-success fw-semibold">{{ r.mtrecu | number:'1.0-0' }} FCFA</td>
                <td class="text-end pe-3">{{ r.mtpayer | number:'1.0-0' }} FCFA</td>
                <td class="text-muted" style="white-space:nowrap">{{ r.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="text-muted">{{ r.auteur || '-' }}</td>
              </tr>
              <tr *ngIf="currentReglements.length === 0">
                <td colspan="6" class="text-center text-muted py-4">Aucun règlement pour cette zone</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

`,
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
    this.loading = true;
    Promise.allSettled([
      this.clientService.list(0, 1).toPromise(),
      this.produitService.list(0, 1).toPromise(),
      this.factureService.list(0, 1).toPromise(),
      this.factureService.countImpayees().toPromise()
    ]).then(([clientsRes, produitsRes, facturesRes, impayeesRes]) => {
      const clients  = clientsRes.status  === 'fulfilled' ? clientsRes.value  : null;
      const produits = produitsRes.status === 'fulfilled' ? produitsRes.value : null;
      const factures = facturesRes.status === 'fulfilled' ? facturesRes.value : null;
      const impayes  = impayeesRes.status === 'fulfilled' ? impayeesRes.value : null;

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
          label: 'Factures',
          value: (factures as any)?.data?.pagination?.total ?? (factures as any)?.data?.data?.length ?? 0,
          icon: 'fas fa-file-invoice',
          color: '#f59e0b',
          bg: '#fff3cd',
          link: '/gestion-bars/factures',
          description: 'Total des factures'
        },
        {
          label: 'Impayées',
          value: (impayes as any)?.data?.factureTotalImpayeeNumber ?? (impayes as any)?.data?.count ?? 0,
          icon: 'fas fa-exclamation-triangle',
          color: '#dc3545',
          bg: '#f8d7da',
          link: '/statistiques/impayes',
          description: 'Factures non réglées'
        }
      ];
      this.loading = false;
    });
  }
}
