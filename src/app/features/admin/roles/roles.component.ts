import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleService, Role, RoleScreen } from '../../../core/services/role.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

interface ScreenDef { path: string; label: string; section: string; }

const ALL_SCREENS: ScreenDef[] = [
  { path: '/dashboard',                     label: 'Tableau de bord',     section: 'Général'         },
  { path: '/gestion-bars/clients',          label: 'Clients',             section: 'Gestion Bars'    },
  { path: '/gestion-bars/fournisseurs',     label: 'Fournisseurs',        section: 'Gestion Bars'    },
  { path: '/gestion-bars/modeles',          label: 'Catégories',          section: 'Gestion Bars'    },
  { path: '/gestion-bars/produits/R1',       label: 'Produits',            section: 'Zone R1'         },
  { path: '/gestion-stock/R1',              label: 'Gestion stock',       section: 'Zone R1'         },
  { path: '/facturation/R1',                label: 'Facturation',         section: 'Zone R1'         },
  { path: '/gestion-bars/factures/R1',      label: 'Factures',            section: 'Zone R1'         },
  { path: '/gestion-bars/reglements/R1',    label: 'Règlements',          section: 'Zone R1'         },
  { path: '/gestion-bars/produits/RC',      label: 'Produits',            section: 'Zone RC'         },
  { path: '/gestion-stock/RC',              label: 'Gestion stock',       section: 'Zone RC'         },
  { path: '/facturation/RC',                label: 'Facturation',         section: 'Zone RC'         },
  { path: '/gestion-bars/factures/RC',      label: 'Factures',            section: 'Zone RC'         },
  { path: '/gestion-bars/reglements/RC',    label: 'Règlements',          section: 'Zone RC'         },
  { path: '/statistiques/factures',         label: 'Stat. factures',      section: 'Statistiques'    },
  { path: '/statistiques/ventes',           label: 'Stat. ventes',        section: 'Statistiques'    },
  { path: '/statistiques/archivees',        label: 'Factures archivées',  section: 'Statistiques'    },
  { path: '/statistiques/impayes',          label: 'Factures impayées',   section: 'Statistiques'    },
  { path: '/statistiques/stock',            label: 'Inventaire stock',    section: 'Statistiques'    },
  { path: '/statistiques/caisse-mensuelle', label: 'Caisse mensuelle',    section: 'Statistiques'    },
  { path: '/admin/users',                   label: 'Utilisateurs',        section: 'Administration'  },
  { path: '/admin/roles',                   label: 'Rôles & Permissions', section: 'Administration'  },
  { path: '/admin/settings',               label: 'Paramètres',          section: 'Administration'  },
];

const SCREEN_SECTIONS = [...new Set(ALL_SCREENS.map(s => s.section))];

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-header">
      <div>
        <h1 class="page-title"><i class="fas fa-shield-alt me-2 text-primary"></i>Rôles & Permissions</h1>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">Administration</li>
            <li class="breadcrumb-item active">Rôles & Permissions</li>
          </ol>
        </nav>
      </div>
    </div>

    <div class="row g-4">

      <!-- Liste des rôles -->
      <div class="col-md-4">
        <div class="card-custom h-100">
          <div class="card-header"><i class="fas fa-users-cog me-2"></i>Rôles</div>
          <div class="card-body p-0">
            <div *ngIf="loadingRoles" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>
            <div class="list-group list-group-flush" *ngIf="!loadingRoles">
              <button *ngFor="let r of roles" type="button"
                class="list-group-item list-group-item-action d-flex align-items-center gap-2 py-3 px-4"
                [class.active]="selectedRole?.id === r.id"
                (click)="selectRole(r)">
                <span class="badge rounded-pill" [class.bg-danger]="r.name === 'SUPER-ADMIN'"
                  [class.bg-warning]="r.name === 'ADMINISTRATEUR'"
                  [class.bg-success]="r.name === 'GERANT'"
                  [class.bg-primary]="r.name === 'FACTURIER-R1'"
                  [class.bg-info]="r.name === 'FACTURIER-RC'"
                  style="width:10px;height:10px;padding:0">&nbsp;</span>
                <div class="flex-grow-1 text-start">
                  <div class="fw-bold small">{{ r.name }}</div>
                  <div class="text-muted" style="font-size:.75rem">{{ r.description || '—' }}</div>
                </div>
                <span class="badge bg-secondary">{{ r.screens?.length ?? 0 }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Écrans du rôle sélectionné -->
      <div class="col-md-8">
        <div class="card-custom h-100">
          <div class="card-header d-flex justify-content-between align-items-center">
            <span>
              <i class="fas fa-desktop me-2"></i>
              Écrans — <strong>{{ selectedRole?.name || '…' }}</strong>
            </span>
            <div class="d-flex gap-2" *ngIf="selectedRole">
              <button class="btn btn-sm btn-outline-secondary" (click)="toggleAll(false)">
                <i class="fas fa-times me-1"></i>Tout décocher
              </button>
              <button class="btn btn-sm btn-outline-primary" (click)="toggleAll(true)">
                <i class="fas fa-check-double me-1"></i>Tout cocher
              </button>
              <button class="btn btn-sm btn-success" (click)="saveScreens()" [disabled]="saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm me-1"></span>
                <i *ngIf="!saving" class="fas fa-save me-1"></i>
                {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
              </button>
            </div>
          </div>
          <div class="card-body">

            <div *ngIf="!selectedRole" class="text-center text-muted py-5">
              <i class="fas fa-hand-pointer fa-2x mb-3 d-block opacity-50"></i>
              Sélectionnez un rôle pour gérer ses permissions
            </div>

            <div *ngIf="loadingScreens" class="text-center py-4">
              <div class="spinner-border spinner-border-sm text-primary"></div>
            </div>

            <div *ngIf="selectedRole && !loadingScreens">
              <!-- Compteur -->
              <div class="d-flex align-items-center gap-2 mb-3">
                <span class="badge bg-primary">{{ checkedCount }} / {{ allScreens.length }} écrans sélectionnés</span>
              </div>

              <!-- Sections de screens -->
              <ng-container *ngFor="let section of sections">
                <h6 class="text-muted text-uppercase small fw-bold mb-2 mt-3">
                  <i class="fas fa-folder-open me-1"></i>{{ section }}
                </h6>
                <div class="row g-2 mb-2">
                  <div *ngFor="let screen of getScreensBySection(section)" class="col-md-6">
                    <label class="d-flex align-items-center gap-2 p-2 rounded border cursor-pointer"
                      style="cursor:pointer"
                      [class.border-primary]="isChecked(screen.path)"
                      [class.bg-primary]="isChecked(screen.path)"
                      [class.bg-opacity-10]="isChecked(screen.path)">
                      <input type="checkbox" class="form-check-input mt-0"
                        [checked]="isChecked(screen.path)"
                        (change)="toggleScreen(screen)" />
                      <span>
                        <span class="d-block" style="font-size:.85rem; font-weight:500">{{ screen.label }}</span>
                        <span class="text-muted" style="font-size:.72rem">{{ screen.path }}</span>
                      </span>
                    </label>
                  </div>
                </div>
              </ng-container>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class RolesComponent implements OnInit {
  roles: Role[] = [];
  selectedRole: Role | null = null;
  checkedPaths = new Set<string>();
  allScreens = ALL_SCREENS;
  sections = SCREEN_SECTIONS;
  loadingRoles = false;
  loadingScreens = false;
  saving = false;

  constructor(private roleService: RoleService, private snackbar: SnackbarService) {}

  ngOnInit(): void { this.loadRoles(); }

  loadRoles(): void {
    this.loadingRoles = true;
    this.roleService.list().subscribe({
      next: (res: any) => {
        this.roles = res?.data || [];
        this.loadingRoles = false;
      },
      error: () => { this.loadingRoles = false; }
    });
  }

  selectRole(role: Role): void {
    this.selectedRole = role;
    this.checkedPaths.clear();
    this.loadingScreens = true;
    this.roleService.getScreens(role.id).subscribe({
      next: (res: any) => {
        const screens: RoleScreen[] = res?.data || [];
        screens.forEach(s => this.checkedPaths.add(s.path));
        this.loadingScreens = false;
      },
      error: () => { this.loadingScreens = false; }
    });
  }

  getScreensBySection(section: string): ScreenDef[] {
    return ALL_SCREENS.filter(s => s.section === section);
  }

  isChecked(path: string): boolean { return this.checkedPaths.has(path); }

  toggleScreen(screen: ScreenDef): void {
    this.checkedPaths.has(screen.path)
      ? this.checkedPaths.delete(screen.path)
      : this.checkedPaths.add(screen.path);
  }

  toggleAll(check: boolean): void {
    check
      ? ALL_SCREENS.forEach(s => this.checkedPaths.add(s.path))
      : this.checkedPaths.clear();
  }

  get checkedCount(): number { return this.checkedPaths.size; }

  saveScreens(): void {
    if (!this.selectedRole) return;
    this.saving = true;
    const screens: RoleScreen[] = ALL_SCREENS
      .filter(s => this.checkedPaths.has(s.path))
      .map(s => ({ path: s.path, label: s.label }));
    this.roleService.assignScreens(this.selectedRole.id, screens).subscribe({
      next: () => {
        const role = this.roles.find(r => r.id === this.selectedRole!.id);
        if (role) role.screens = screens;
        this.snackbar.success(`Permissions de "${this.selectedRole!.name}" mises à jour`);
        this.saving = false;
      },
      error: () => { this.saving = false; }
    });
  }
}
