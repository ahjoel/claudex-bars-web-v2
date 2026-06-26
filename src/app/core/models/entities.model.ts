export interface BaseEntity {
  id: number;
  createdAt?: string;
  createdBy?: number;
  updatedAt?: string;
  updatedBy?: number;
  deletedAt?: string;
  deletedBy?: number;
}

export interface Client extends BaseEntity {
  code?: string;
  name: string;
  description?: string;
  type?: string;
  tel?: string;
  mail?: string;
}

export interface Fournisseur extends BaseEntity {
  name: string;
  description?: string;
}

export interface ModelCategory extends BaseEntity {
  name: string;
  description?: string;
}

export interface Produit extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  modelId: number;
  fournisseurId?: number;
  pv: number;
  stock_min?: number;
  stock?: string;
  fournisseur?: Fournisseur;
  model?: ModelCategory;
}

export interface Facture extends BaseEntity {
  code: string;
  client_id: number;
  tax?: number;
  remise?: number;
  montantHT?: number;
  clientName?: string;
  client?: Client;
  mouvements?: Mouvement[];
  reglements?: Reglement[];
}

export interface Mouvement extends BaseEntity {
  code?: string;
  produitId: number;
  factureId?: number;
  types: 'ADD' | 'OUT';
  qte: number;
  pv?: number;
  stock?: 'R1' | 'RC';
  produit?: string;
  produitCode?: string;
  produitObj?: Produit;
}

export interface Reglement extends BaseEntity {
  factureId: number;
  mtrecu: number;
  mtpayer: number;
  code?: string;
  facture?: Facture;
  client?: Client;
  auteur?: string;
}

export interface AppUser extends BaseEntity {
  username: string;
  email: string;
  firstname: string;
  lastname: string;
  profile?: string;
  zone?: string;
  password?: string;
  screens?: string[];
  roles?: string[];
  permissions?: string[];
}

export interface ApiResponse<T> {
  status?: number;
  message?: string;
  description?: string;
  data: T;
  header?: {
    requestId: string;
    timestamp: string;
    statusCode: number;
    message: string;
    status: string;
  };
}

export interface PaginatedData<T> {
  data: T[];
  pagination?: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

export interface StatDate {
  date_debut: string;
  date_fin: string;
}
