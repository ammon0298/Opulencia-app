
export enum UserRole {
  ADMIN = 'ADMIN',
  COLLECTOR = 'COLLECTOR'
}

export type AccountStatus = 'Active' | 'Inactive';

export interface User {
  id: string;
  businessId: string; // Identificador único de la zona de cobro/negocio
  username: string;
  password?: string;
  name: string;
  dni: string;
  phone: string;
  address: string;
  role: UserRole;
  routeIds: string[];
  status: AccountStatus;
  // Campos extendidos para perfil
  businessName?: string;
  country?: string;
  city?: string;
  // Geolocalización en tiempo real
  currentLocation?: {
    lat: number;
    lng: number;
    timestamp: string; // ISO String de la última actualización
  };
}

export interface Route {
  id: string;
  businessId: string;
  name: string;
}

export interface RouteTransaction {
  id: string;
  businessId: string;
  routeId: string;
  date: string; // YYYY-MM-DD
  amount: number;
  type: 'INITIAL_BASE' | 'INJECTION' | 'WITHDRAWAL';
  description: string;
}

export interface Client {
  id: string;
  businessId: string;
  dni: string;
  name: string;
  alias: string;
  address: string;
  phone: string;
  routeId: string;
  order: number;
  status: AccountStatus;
  // Geo
  coordinates?: { lat: number; lng: number };
}

export type CreditStatus = 'Active' | 'Completed' | 'Lost';

export interface Credit {
  id: string;
  businessId: string;
  clientId: string;
  capital: number;
  totalToPay: number;
  installmentValue: number;
  totalInstallments: number;
  paidInstallments: number;
  totalPaid: number; 
  frequency: 'Daily' | 'Weekly' | 'Monthly';
  startDate: string;
  firstPaymentDate: string; // Nueva propiedad fundamental para proyecciones
  isOverdue: boolean;
  status: CreditStatus; 
}

export interface Payment {
  id: string;
  businessId: string;
  creditId: string;
  date: string;
  amount: number;
  note?: string;
}

export interface Expense {
  id: string;
  businessId: string;
  date: string;
  routeId: string;
  value: number;
  name: string;
  type: 'Operational' | 'Personal';
  concept: string;
  proofImage?: string; // Base64 image string for receipt/voucher
}
