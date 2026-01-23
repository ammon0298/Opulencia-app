
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Genera un hash seguro a partir de una contraseña en texto plano.
 * Usado al crear usuarios o cambiar contraseñas.
 */
export const hashPassword = (plainPassword: string): string => {
  if (!plainPassword) return '';
  // Usamos hashSync para simplificar el flujo sincrónico del prototipo, 
  // en producción con Supabase esto lo manejaría el backend o una Edge Function.
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
};

/**
 * Compara una contraseña en texto plano con un hash almacenado.
 * Usado en el Login.
 */
export const verifyPassword = (plainPassword: string, hash: string): boolean => {
  if (!plainPassword || !hash) return false;
  return bcrypt.compareSync(plainPassword, hash);
};

/**
 * Valida la fortaleza de la contraseña
 */
export const isStrongPassword = (password: string): boolean => {
  // Mínimo 6 caracteres (para este caso de uso), idealmente 8+ con alfanuméricos
  return password.length >= 6;
};

/**
 * Genera un código numérico de 6 dígitos para recuperación
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
