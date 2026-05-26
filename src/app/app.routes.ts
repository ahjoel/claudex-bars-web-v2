import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { UnauthorizedComponent } from './features/auth/unauthorized/unauthorized.component';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ClientsListComponent } from './features/gestion-bars/clients/clients-list.component';
import { FournisseursListComponent } from './features/gestion-bars/fournisseurs/fournisseurs-list.component';
import { ModelesListComponent } from './features/gestion-bars/modeles/modeles-list.component';
import { ProduitsListComponent } from './features/gestion-bars/produits/produits-list.component';
import { FacturesListComponent } from './features/gestion-bars/factures/factures-list.component';
import { ReglementsListComponent } from './features/gestion-bars/reglements/reglements-list.component';
import { GestionStockComponent } from './features/gestion-stock/gestion-stock.component';
import { FacturationComponent } from './features/facturation/facturation.component';
import { FacturesStatComponent } from './features/statistiques/factures-stat/factures-stat.component';
import { VentesStatComponent } from './features/statistiques/ventes-stat/ventes-stat.component';
import { ArchiveesStatComponent } from './features/statistiques/archivees-stat/archivees-stat.component';
import { ImpayesStatComponent } from './features/statistiques/impayes-stat/impayes-stat.component';
import { StockStatComponent } from './features/statistiques/stock-stat/stock-stat.component';
import { CaisseMensuelleComponent } from './features/statistiques/caisse-mensuelle/caisse-mensuelle.component';
import { UsersComponent } from './features/admin/users/users.component';
import { SettingsComponent } from './features/admin/settings/settings.component';
import { RolesComponent } from './features/admin/roles/roles.component';
import { AuthGuard } from './core/guards/auth.guard';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },
  {
    path: 'dashboard',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: DashboardComponent, canActivate: [RoleGuard], data: { screenPath: '/dashboard' } }
    ]
  },
  {
    path: 'gestion-bars',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',             redirectTo: 'clients', pathMatch: 'full' },
      { path: 'clients',      component: ClientsListComponent,      canActivate: [RoleGuard], data: { screenPath: '/gestion-bars/clients'      } },
      { path: 'produits',     component: ProduitsListComponent,     canActivate: [RoleGuard], data: { screenPath: '/gestion-bars/produits'     } },
      { path: 'fournisseurs', component: FournisseursListComponent, canActivate: [RoleGuard], data: { screenPath: '/gestion-bars/fournisseurs' } },
      { path: 'factures',     component: FacturesListComponent,     canActivate: [RoleGuard], data: { screenPath: '/gestion-bars/factures'     } },
      { path: 'reglements',   component: ReglementsListComponent,   canActivate: [RoleGuard], data: { screenPath: '/gestion-bars/reglements'   } },
      { path: 'modeles',      component: ModelesListComponent,      canActivate: [RoleGuard], data: { screenPath: '/gestion-bars/modeles'      } }
    ]
  },
  {
    path: 'gestion-stock',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: GestionStockComponent, canActivate: [RoleGuard], data: { screenPath: '/gestion-stock' } }
    ]
  },
  {
    path: 'facturation',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', component: FacturationComponent, canActivate: [RoleGuard], data: { screenPath: '/facturation' } }
    ]
  },
  {
    path: 'statistiques',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',                  redirectTo: 'factures', pathMatch: 'full' },
      { path: 'factures',          component: FacturesStatComponent,    canActivate: [RoleGuard], data: { screenPath: '/statistiques/factures'         } },
      { path: 'ventes',            component: VentesStatComponent,      canActivate: [RoleGuard], data: { screenPath: '/statistiques/ventes'            } },
      { path: 'archivees',         component: ArchiveesStatComponent,   canActivate: [RoleGuard], data: { screenPath: '/statistiques/archivees'         } },
      { path: 'impayes',           component: ImpayesStatComponent,     canActivate: [RoleGuard], data: { screenPath: '/statistiques/impayes'           } },
      { path: 'stock',             component: StockStatComponent,       canActivate: [RoleGuard], data: { screenPath: '/statistiques/stock'             } },
      { path: 'caisse-mensuelle',  component: CaisseMensuelleComponent, canActivate: [RoleGuard], data: { screenPath: '/statistiques/caisse-mensuelle'  } }
    ]
  },
  {
    path: 'admin',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '',         redirectTo: 'users', pathMatch: 'full' },
      { path: 'users',    component: UsersComponent,    canActivate: [RoleGuard], data: { screenPath: '/admin/users'    } },
      { path: 'settings', component: SettingsComponent, canActivate: [RoleGuard], data: { screenPath: '/admin/settings' } },
      { path: 'roles',    component: RolesComponent,    canActivate: [RoleGuard], data: { screenPath: '/admin/roles'    } }
    ]
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'unauthorized' }
];
