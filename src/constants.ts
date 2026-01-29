import { User, UserRole, Route, Client, Credit, Expense, Payment, RouteTransaction } from './types';

// FUNCIÓN DE FECHA LOCAL CORREGIDA
// Obtiene la fecha basada en la zona horaria del dispositivo del usuario, no en UTC.
const getLocalISOString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Obtiene la FECHA Y HORA exacta del sistema local (sin convertir a UTC)
// Formato: YYYY-MM-DDTHH:mm:ss (Compatible con ISO 8601 para DB)
export const getCurrentLocalTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const TODAY_STR = getLocalISOString();
const B_ID = 'business_001'; 

// Base de datos de países global
export const COUNTRY_DATA = [
  // South America
  { code: 'CO', name: 'Colombia', dial_code: '+57', continent: 'América del Sur', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', dial_code: '+54', continent: 'América del Sur', flag: '🇦🇷' },
  { code: 'PE', name: 'Perú', dial_code: '+51', continent: 'América del Sur', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', dial_code: '+56', continent: 'América del Sur', flag: '🇨🇱' },
  { code: 'BR', name: 'Brasil', dial_code: '+55', continent: 'América del Sur', flag: '🇧🇷' },
  { code: 'EC', name: 'Ecuador', dial_code: '+593', continent: 'América del Sur', flag: '🇪🇨' },
  { code: 'VE', name: 'Venezuela', dial_code: '+58', continent: 'América del Sur', flag: '🇻🇪' },
  
  // North & Central America
  { code: 'MX', name: 'México', dial_code: '+52', continent: 'América del Norte/Central', flag: '🇲🇽' },
  { code: 'US', name: 'Estados Unidos', dial_code: '+1', continent: 'América del Norte/Central', flag: '🇺🇸' },
  { code: 'PA', name: 'Panamá', dial_code: '+507', continent: 'América del Norte/Central', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', dial_code: '+506', continent: 'América del Norte/Central', flag: '🇨🇷' },
  { code: 'DO', name: 'República Dominicana', dial_code: '+1-809', continent: 'América del Norte/Central', flag: '🇩🇴' },

  // Europe
  { code: 'ES', name: 'España', dial_code: '+34', continent: 'Europa', flag: '🇪🇸' },
  { code: 'FR', name: 'Francia', dial_code: '+33', continent: 'Europa', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', dial_code: '+49', continent: 'Europa', flag: '🇩🇪' },
  { code: 'IT', name: 'Italia', dial_code: '+39', continent: 'Europa', flag: '🇮🇹' },
  { code: 'GB', name: 'Reino Unido', dial_code: '+44', continent: 'Europa', flag: '🇬🇧' },

  // Asia / Others
  { code: 'CN', name: 'China', dial_code: '+86', continent: 'Asia', flag: '🇨🇳' },
  { code: 'JP', name: 'Japón', dial_code: '+81', continent: 'Asia', flag: '🇯🇵' },
  { code: 'IN', name: 'India', dial_code: '+91', continent: 'Asia', flag: '🇮🇳' },
];

/**
 * Suma días hábiles a una fecha (Salta Domingos).
 * Usado para proyectar fechas de pago en frecuencia DIARIA.
 */
export const addBusinessDays = (startDateStr: string, daysToAdd: number): Date => {
  const current = new Date(startDateStr + 'T00:00:00');
  let added = 0;
  // Si daysToAdd es 0, devolvemos la misma fecha
  if (daysToAdd === 0) return current;
  
  while (added < daysToAdd) {
    current.setDate(current.getDate() + 1);
    // 0 = Domingo. Si es Domingo, no aumentamos el contador 'added', 
    // pero el bucle continúa y sumará otro día en la siguiente iteración.
    if (current.getDay() !== 0) {
      added++;
    }
  }
  return current;
};

/**
 * Cuenta cuántos días hábiles (Lunes-Sábado) hay entre dos fechas.
 * Usado para calcular cuántas cuotas diarias deberían ir pagas a la fecha.
 */
export const countBusinessDays = (startDateStr: string, endDateStr: string): number => {
  const start = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');
  
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);
  
  // Avanzamos desde el día siguiente al inicio hasta la fecha fin
  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (current.getDay() !== 0) {
      count++;
    }
  }
  return count;
};

export const MOCK_ROUTES: Route[] = [
  { id: '1', businessId: B_ID, name: 'Ruta Norte' },
  { id: '2', businessId: B_ID, name: 'Ruta Sur' },
  { id: '3', businessId: B_ID, name: 'Grupo General' }
];

export const MOCK_TRANSACTIONS: RouteTransaction[] = [
  // Fondos iniciales antiguos para que el cálculo matemático tenga sentido
  { id: 'rt1', businessId: B_ID, routeId: '1', date: '2025-01-01', amount: 5000, type: 'INITIAL_BASE', description: 'Fondo Inicial Ruta Norte' },
  { id: 'rt2', businessId: B_ID, routeId: '2', date: '2025-01-01', amount: 4000, type: 'INITIAL_BASE', description: 'Fondo Inicial Ruta Sur' },
  { id: 'rt3', businessId: B_ID, routeId: '3', date: '2025-01-01', amount: 2000, type: 'INITIAL_BASE', description: 'Fondo Inicial Grupo General' },
  
  // Una inyección reciente en Ruta Norte
  { id: 'rt4', businessId: B_ID, routeId: '1', date: '2026-01-15', amount: 1000, type: 'INJECTION', description: 'Refuerzo de Capital' },
  
  // Un retiro de ganancias en Ruta Sur
  { id: 'rt5', businessId: B_ID, routeId: '2', date: '2026-01-18', amount: 500, type: 'WITHDRAWAL', description: 'Retiro Utilidades Semanal' }
];

export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    businessId: B_ID,
    username: 'chepe@opulencia.com', 
    password: 'admin123',
    name: 'Jose Albeiro Cataño', 
    dni: '123789654',
    role: UserRole.ADMIN, 
    routeIds: [],
    status: 'Active',
    phone: '+55 5550101',
    address: 'Sede Principal',
    businessName: 'Jose SA',
    country: 'Brasil',
    city: 'Rio de Janeiro'
  },
  { 
    id: 'u2', 
    businessId: B_ID,
    username: 'juan@opulencia.com', 
    password: 'juan123',
    name: 'Juan Cobrador', 
    dni: '80123456',
    role: UserRole.COLLECTOR, 
    routeIds: ['1', '3'],
    status: 'Active',
    phone: '+57 3109998877',
    address: 'Calle 50 #10',
    country: 'Colombia',
    city: 'Medellín'
  },
  { 
    id: 'u3', 
    businessId: B_ID,
    username: 'jairo@opulencia.com', 
    password: 'jairo123',
    name: 'Jairo Aguirre', 
    dni: '90456123',
    role: UserRole.COLLECTOR, 
    routeIds: ['2'],
    status: 'Active',
    phone: '+57 3154445566',
    address: 'Barrio El Sur #4-20',
    country: 'Colombia',
    city: 'Cali'
  }
];

export const MOCK_CLIENTS: Client[] = [
  // Ruta Norte (id: 1)
  { id: 'c1', businessId: B_ID, dni: '12345', name: 'Carlos Gomez', alias: 'Carlos G', address: 'Calle 10 #20', phone: '300123', routeId: '1', order: 1, status: 'Active' },
  { id: 'c2', businessId: B_ID, dni: '67890', name: 'Maria Lopez', alias: 'Doña Maria', address: 'Av 5 #15', phone: '310456', routeId: '1', order: 2, status: 'Active' },
  { id: 'c3', businessId: B_ID, dni: '11223', name: 'Pedro Perez', alias: 'Pepe', address: 'Carrera 8 #4', phone: '320789', routeId: '1', order: 3, status: 'Active' },
  { id: 'c7', businessId: B_ID, dni: '77889', name: 'Marilin Monroe', alias: 'Mari', address: 'Av Principal #45', phone: '300987', routeId: '1', order: 4, status: 'Active' },
  { id: 'c8', businessId: B_ID, dni: '88112', name: 'Ricardo Arjona', alias: 'Flaco', address: 'Calle Luna #1', phone: '312555', routeId: '1', order: 5, status: 'Active' },

  // Ruta Sur (id: 2)
  { id: 'c4', businessId: B_ID, dni: '22334', name: 'Beatriz Pinzon', alias: 'Betty', address: 'Diagonal 40 Sur', phone: '314111', routeId: '2', order: 1, status: 'Active' },
  { id: 'c5', businessId: B_ID, dni: '33445', name: 'Armando Mendoza', alias: 'Don Armando', address: 'Transversal 10', phone: '316222', routeId: '2', order: 2, status: 'Active' },
  { id: 'c6', businessId: B_ID, dni: '44556', name: 'Patricia Fernandez', alias: 'Peliteñida', address: 'Apto 202 Norte', phone: '318333', routeId: '2', order: 3, status: 'Active' }
];

// RECALIBRACIÓN DE CRÉDITOS PARA FECHA ACTUAL
export const MOCK_CREDITS: Credit[] = [
  // --- RUTA NORTE (Juan) ---

  // CR1: Crédito Normal / Sano. Inicio Ene 10. Aprox 10 días hábiles. Pagado 9. Al día.
  { id: 'cr1', businessId: B_ID, clientId: 'c1', capital: 1000, totalToPay: 1200, installmentValue: 50, totalInstallments: 24, paidInstallments: 9, totalPaid: 450, frequency: 'Daily', startDate: '2026-01-10', firstPaymentDate: '2026-01-10', isOverdue: false, status: 'Active' }, 
  
  // CR2: MORA (PÚRPURA). Semanal. Inicio 1 Dic 2025. Debería llevar ~7 cuotas. Solo lleva 1.
  { id: 'cr2', businessId: B_ID, clientId: 'c2', capital: 500, totalToPay: 600, installmentValue: 30, totalInstallments: 20, paidInstallments: 1, totalPaid: 30, frequency: 'Weekly', startDate: '2025-12-01', firstPaymentDate: '2025-12-08', isOverdue: true, status: 'Active' }, 
  
  // CR3: MORA CRÍTICA (PÚRPURA). Diario. Inicio 1 Dic 2025. Han pasado ~43 días hábiles. Solo ha pagado 5.
  { id: 'cr3', businessId: B_ID, clientId: 'c3', capital: 2000, totalToPay: 2400, installmentValue: 100, totalInstallments: 24, paidInstallments: 5, totalPaid: 500, frequency: 'Daily', startDate: '2025-12-01', firstPaymentDate: '2025-12-01', isOverdue: true, status: 'Active' }, 
  
  // CR7: LIQUIDADO (ESMERALDA). Pagó todo.
  { id: 'cr7', businessId: B_ID, clientId: 'c7', capital: 800, totalToPay: 1000, installmentValue: 50, totalInstallments: 20, paidInstallments: 20, totalPaid: 1000, frequency: 'Daily', startDate: '2025-11-01', firstPaymentDate: '2025-11-01', isOverdue: false, status: 'Completed' }, 
  
  // CR8: FALTA 1 (ROSA). Inicio 7 Ene. ~12 días hábiles hasta 21 Ene. Total 12 cuotas. Pagó 11. Le falta 1.
  { id: 'cr8', businessId: B_ID, clientId: 'c8', capital: 1000, totalToPay: 1200, installmentValue: 100, totalInstallments: 12, paidInstallments: 11, totalPaid: 1100, frequency: 'Daily', startDate: '2026-01-07', firstPaymentDate: '2026-01-07', isOverdue: false, status: 'Active' }, 

  // --- RUTA SUR (Jairo) ---

  // CR4: FALTA 3 (ÁMBAR). Inicio 2 Ene. ~16 días hábiles. Total 18 cuotas. Pagó 15. Le faltan 3.
  { id: 'cr4', businessId: B_ID, clientId: 'c4', capital: 1500, totalToPay: 1800, installmentValue: 100, totalInstallments: 18, paidInstallments: 15, totalPaid: 1500, frequency: 'Daily', startDate: '2026-01-02', firstPaymentDate: '2026-01-02', isOverdue: false, status: 'Active' }, 
  
  // CR5: MORA CRÍTICA (PÚRPURA). Inicio 2 Ene. Debería llevar ~16 cuotas. Solo lleva 2.
  { id: 'cr5', businessId: B_ID, clientId: 'c5', capital: 3000, totalToPay: 3600, installmentValue: 150, totalInstallments: 24, paidInstallments: 2, totalPaid: 300, frequency: 'Daily', startDate: '2026-01-02', firstPaymentDate: '2026-01-02', isOverdue: true, status: 'Active' }, 
  
  // CR6: LIQUIDADO (ESMERALDA).
  { id: 'cr6', businessId: B_ID, clientId: 'c6', capital: 500, totalToPay: 600, installmentValue: 60, totalInstallments: 10, paidInstallments: 10, totalPaid: 600, frequency: 'Weekly', startDate: '2025-11-01', firstPaymentDate: '2025-11-08', isOverdue: false, status: 'Completed' }  
];

// GASTOS DEL DÍA HOY
export const MOCK_EXPENSES: Expense[] = [
  { id: 'e1', businessId: B_ID, date: TODAY_STR, routeId: '1', value: 30, name: 'Gasolina Juan', type: 'Operational', concept: 'Tanqueo diario Ruta Norte' },
  { id: 'e2', businessId: B_ID, date: TODAY_STR, routeId: '2', value: 25, name: 'Almuerzo Jairo', type: 'Operational', concept: 'Viáticos Ruta Sur' }
];

export const MOCK_PAYMENTS: Payment[] = [
  // --- PAGOS HISTÓRICOS Y DE HOY ---
  
  // CR1 (Carlos): Total pagado 450 (9 cuotas de 50).
  // Pagos desde Ene 10. Último pago HOY (21 Ene).
  { id: 'p_cr1_1', businessId: B_ID, creditId: 'cr1', date: '2026-01-10', amount: 50 },
  { id: 'p_cr1_2', businessId: B_ID, creditId: 'cr1', date: '2026-01-12', amount: 50 },
  { id: 'p_cr1_3', businessId: B_ID, creditId: 'cr1', date: '2026-01-13', amount: 50 },
  { id: 'p_cr1_4', businessId: B_ID, creditId: 'cr1', date: '2026-01-14', amount: 50 },
  { id: 'p_cr1_5', businessId: B_ID, creditId: 'cr1', date: '2026-01-15', amount: 50 },
  { id: 'p_cr1_6', businessId: B_ID, creditId: 'cr1', date: '2026-01-16', amount: 50 },
  { id: 'p_cr1_7', businessId: B_ID, creditId: 'cr1', date: '2026-01-17', amount: 50 },
  { id: 'p_cr1_8', businessId: B_ID, creditId: 'cr1', date: '2026-01-20', amount: 50 },
  { id: 'p_cr1_now', businessId: B_ID, creditId: 'cr1', date: TODAY_STR, amount: 50 }, // PAGO DE HOY

  // CR2 (Maria - MORA): Total pagado 30 (1 cuota). Pagó la primera hace mucho.
  { id: 'p_cr2_1', businessId: B_ID, creditId: 'cr2', date: '2025-12-08', amount: 30 },

  // CR3 (Pedro - MORA): Total pagado 500. Dejó de pagar en Diciembre.
  { id: 'p_cr3_1', businessId: B_ID, creditId: 'cr3', date: '2025-12-01', amount: 100 },
  { id: 'p_cr3_2', businessId: B_ID, creditId: 'cr3', date: '2025-12-02', amount: 100 },
  { id: 'p_cr3_3', businessId: B_ID, creditId: 'cr3', date: '2025-12-03', amount: 100 },
  { id: 'p_cr3_4', businessId: B_ID, creditId: 'cr3', date: '2025-12-04', amount: 100 },
  { id: 'p_cr3_5', businessId: B_ID, creditId: 'cr3', date: '2025-12-05', amount: 100 },

  // CR7 (Marilin - Liquidado): Total pagado 1000.
  { id: 'p_cr7_full', businessId: B_ID, creditId: 'cr7', date: '2025-11-25', amount: 1000 },

  // CR8 (Ricardo - FALTA 1): Total pagado 1100 (11 cuotas de 100).
  // Start Ene 7. Pagó todo puntual hasta hoy que hizo el pago 11. Mañana acaba.
  { id: 'p_cr8_1', businessId: B_ID, creditId: 'cr8', date: '2026-01-07', amount: 100 },
  { id: 'p_cr8_2', businessId: B_ID, creditId: 'cr8', date: '2026-01-08', amount: 100 },
  { id: 'p_cr8_3', businessId: B_ID, creditId: 'cr8', date: '2026-01-09', amount: 100 },
  { id: 'p_cr8_4', businessId: B_ID, creditId: 'cr8', date: '2026-01-10', amount: 100 },
  { id: 'p_cr8_5', businessId: B_ID, creditId: 'cr8', date: '2026-01-12', amount: 100 },
  { id: 'p_cr8_6', businessId: B_ID, creditId: 'cr8', date: '2026-01-13', amount: 100 },
  { id: 'p_cr8_7', businessId: B_ID, creditId: 'cr8', date: '2026-01-14', amount: 100 },
  { id: 'p_cr8_8', businessId: B_ID, creditId: 'cr8', date: '2026-01-15', amount: 100 },
  { id: 'p_cr8_9', businessId: B_ID, creditId: 'cr8', date: '2026-01-16', amount: 100 },
  { id: 'p_cr8_10', businessId: B_ID, creditId: 'cr8', date: '2026-01-20', amount: 100 }, // Ayer
  { id: 'p_cr8_now', businessId: B_ID, creditId: 'cr8', date: TODAY_STR, amount: 100 }, // PAGO DE HOY

  // CR4 (Beatriz - FALTA 3): Total pagado 1500 (15 cuotas de 100).
  // Start Ene 2.
  { id: 'p_cr4_1', businessId: B_ID, creditId: 'cr4', date: '2026-01-02', amount: 100 },
  { id: 'p_cr4_2', businessId: B_ID, creditId: 'cr4', date: '2026-01-03', amount: 100 },
  { id: 'p_cr4_3', businessId: B_ID, creditId: 'cr4', date: '2026-01-05', amount: 100 },
  { id: 'p_cr4_4', businessId: B_ID, creditId: 'cr4', date: '2026-01-06', amount: 100 },
  { id: 'p_cr4_5', businessId: B_ID, creditId: 'cr4', date: '2026-01-07', amount: 100 },
  { id: 'p_cr4_6', businessId: B_ID, creditId: 'cr4', date: '2026-01-08', amount: 100 },
  { id: 'p_cr4_7', businessId: B_ID, creditId: 'cr4', date: '2026-01-09', amount: 100 },
  { id: 'p_cr4_8', businessId: B_ID, creditId: 'cr4', date: '2026-01-10', amount: 100 },
  { id: 'p_cr4_9', businessId: B_ID, creditId: 'cr4', date: '2026-01-12', amount: 100 },
  { id: 'p_cr4_10', businessId: B_ID, creditId: 'cr4', date: '2026-01-13', amount: 100 },
  { id: 'p_cr4_11', businessId: B_ID, creditId: 'cr4', date: '2026-01-14', amount: 100 },
  { id: 'p_cr4_12', businessId: B_ID, creditId: 'cr4', date: '2026-01-15', amount: 100 },
  { id: 'p_cr4_13', businessId: B_ID, creditId: 'cr4', date: '2026-01-16', amount: 100 },
  { id: 'p_cr4_14', businessId: B_ID, creditId: 'cr4', date: '2026-01-20', amount: 100 },
  { id: 'p_cr4_now', businessId: B_ID, creditId: 'cr4', date: TODAY_STR, amount: 100 }, // PAGO DE HOY

  // CR5 (Armando): Total pagado 300.
  { id: 'p_cr5_1', businessId: B_ID, creditId: 'cr5', date: '2026-01-02', amount: 150 },
  { id: 'p_cr5_2', businessId: B_ID, creditId: 'cr5', date: '2026-01-03', amount: 150 },

  // CR6 (Patricia): Liquidado 600.
  { id: 'p_cr6_full', businessId: B_ID, creditId: 'cr6', date: '2025-12-01', amount: 600 },
];