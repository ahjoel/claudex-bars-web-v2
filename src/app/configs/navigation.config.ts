export interface NavItem {
  title: string;
  path?: string;
  icon?: string;
  queryParams?: Record<string, string>;
  children?: NavItem[];
  superAdminOnly?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navigationConfig: NavSection[] = [
  {
    items: [
      { title: 'Tableau de Bord', path: '/dashboard', icon: 'fas fa-tachometer-alt' }
    ]
  },
  {
    title: 'Gestion Bars',
    items: [
      { title: 'Clients',      icon: 'fas fa-users', path: '/gestion-bars/clients'      },
      { title: 'Fournisseurs', icon: 'fas fa-truck', path: '/gestion-bars/fournisseurs' },
      { title: 'Catégories',   icon: 'fas fa-tags',  path: '/gestion-bars/modeles'      }
    ]
  },
  {
    title: 'Zone R1',
    items: [
      { title: 'Produits R1',    icon: 'fas fa-box',           path: '/gestion-bars/produits',   queryParams: { zone: 'R1' } },
      { title: 'Stock R1',       icon: 'fas fa-warehouse',     path: '/gestion-stock',           queryParams: { zone: 'R1' } },
      { title: 'Facturation R1', icon: 'fas fa-cash-register', path: '/facturation',             queryParams: { zone: 'R1' } },
      { title: 'Factures R1',    icon: 'fas fa-file-invoice',  path: '/gestion-bars/factures',   queryParams: { zone: 'R1' } },
      { title: 'Règlements R1',  icon: 'fas fa-money-bill-wave', path: '/gestion-bars/reglements', queryParams: { zone: 'R1' } }
    ]
  },
  {
    title: 'Zone RC',
    items: [
      { title: 'Produits RC',    icon: 'fas fa-box',           path: '/gestion-bars/produits',   queryParams: { zone: 'RC' } },
      { title: 'Stock RC',       icon: 'fas fa-boxes',         path: '/gestion-stock',           queryParams: { zone: 'RC' } },
      { title: 'Facturation RC', icon: 'fas fa-cash-register', path: '/facturation',             queryParams: { zone: 'RC' } },
      { title: 'Factures RC',    icon: 'fas fa-file-invoice',  path: '/gestion-bars/factures',   queryParams: { zone: 'RC' } },
      { title: 'Règlements RC',  icon: 'fas fa-money-bill-wave', path: '/gestion-bars/reglements', queryParams: { zone: 'RC' } }
    ]
  },
  {
    title: 'Statistiques',
    items: [
      {
        title: 'Rapports',
        icon: 'fas fa-chart-bar',
        children: [
          { title: 'Stat. des factures',      path: '/statistiques/factures'        },
          { title: 'Stat. des ventes',         path: '/statistiques/ventes'           },
          { title: 'Factures archivées',       path: '/statistiques/archivees'        },
          { title: 'Factures impayées',        path: '/statistiques/impayes'          },
          { title: 'Inventaire stock',         path: '/statistiques/stock'            },
          { title: 'Caisse mensuelle',         path: '/statistiques/caisse-mensuelle' }
        ]
      }
    ]
  },
  {
    title: 'Administration',
    items: [
      { title: 'Utilisateurs',        path: '/admin/users',     icon: 'fas fa-user-cog'    },
      { title: 'Rôles & Permissions', path: '/admin/roles',     icon: 'fas fa-shield-alt' },
      { title: 'Paramètres',          path: '/admin/settings',  icon: 'fas fa-cog'         }
    ]
  }
];
