export const ROLES = {
  SUPER_ADMIN:   'SUPER-ADMIN',
  ADMINISTRATEUR: 'ADMINISTRATEUR',
  GERANT:        'GERANT',
  FACTURIER_R1:  'FACTURIER-R1',
  FACTURIER_RC:  'FACTURIER-RC',
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

const ALL_SCREENS = [
  '/dashboard',
  '/gestion-bars/clients',
  '/gestion-bars/fournisseurs',
  '/gestion-bars/modeles',
  '/gestion-bars/produits/R1',
  '/gestion-bars/produits/RC',
  '/gestion-stock/R1',
  '/gestion-stock/RC',
  '/facturation/R1',
  '/facturation/RC',
  '/gestion-bars/factures/R1',
  '/gestion-bars/factures/RC',
  '/gestion-bars/reglements/R1',
  '/gestion-bars/reglements/RC',
  '/statistiques/factures',
  '/statistiques/ventes',
  '/statistiques/archivees',
  '/statistiques/impayes',
  '/statistiques/stock',
  '/statistiques/caisse-mensuelle',
  '/admin/users',
  '/admin/roles',
  '/admin/settings',
];

const ZONE_R1_SCREENS = [
  '/dashboard',
  '/facturation/R1',
  '/gestion-bars/factures/R1',
  '/gestion-bars/reglements/R1',
];

const ZONE_RC_SCREENS = [
  '/dashboard',
  '/facturation/RC',
  '/gestion-bars/factures/RC',
  '/gestion-bars/reglements/RC',
];

const MANAGER_SCREENS = ALL_SCREENS.filter(
  s => s !== '/admin/users' && s !== '/admin/settings'
    && !s.startsWith('/facturation')
    && !s.startsWith('/gestion-bars/factures')
    && !s.startsWith('/gestion-bars/reglements')
);

export const SCREENS_BY_ROLE: Record<string, string[]> = {
  [ROLES.SUPER_ADMIN]:    ALL_SCREENS,
  [ROLES.ADMINISTRATEUR]: ALL_SCREENS,
  [ROLES.GERANT]:         MANAGER_SCREENS,
  [ROLES.FACTURIER_R1]:   ZONE_R1_SCREENS,
  [ROLES.FACTURIER_RC]:   ZONE_RC_SCREENS,
};
