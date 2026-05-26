import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { ClientService } from './client.service';
import { ProduitService } from './produit.service';
import { FactureService } from './facture.service';
import { MouvementService } from './mouvement.service';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(
    private clientService: ClientService,
    private produitService: ProduitService,
    private factureService: FactureService,
    private mouvementService: MouvementService
  ) {}

  getStats(): Observable<any> {
    return forkJoin({
      clients: this.clientService.list(0, 1),
      produits: this.produitService.list(0, 1),
      factures: this.factureService.list(0, 1),
      stock: this.mouvementService.stockDispo()
    }).pipe(
      map(res => ({
        totalClients: (res.clients as any)?.data?.pagination?.total ?? (res.clients as any)?.data?.data?.length ?? 0,
        totalProduits: (res.produits as any)?.data?.pagination?.total ?? (res.produits as any)?.data?.data?.length ?? 0,
        totalFactures: (res.factures as any)?.data?.pagination?.total ?? (res.factures as any)?.data?.data?.length ?? 0,
        stockDisponible: (res.stock as any)?.data ?? 0
      }))
    );
  }
}
