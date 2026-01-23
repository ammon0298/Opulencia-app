
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Genera un hash seguro a partir de una contraseña en texto plano.
 */
export const hashPassword = (plainPassword: string): string => {
  if (!plainPassword) return '';
  return bcrypt.hashSync(plainPassword, SALT_ROUNDS);
};

/**
 * Compara una contraseña en texto plano con un hash almacenado (de DB).
 */
export const verifyPassword = (plainPassword: string, hash: string): boolean => {
  if (!plainPassword || !hash) return false;
  try {
      return bcrypt.compareSync(plainPassword, hash);
  } catch (e) {
      console.error("Error decodificando hash:", e);
      return false;
  }
};

export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
