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
  templateUrl: './roles.component.html'
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
