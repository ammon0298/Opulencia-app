
import emailjs from '@emailjs/browser';

// ==============================================================================
// CONFIGURACIÓN DE EMAIL (Reemplazar con tus datos reales de EmailJS)
// ==============================================================================
// 1. Ve a https://www.emailjs.com/ y crea una cuenta gratuita.
// 2. Crea un "Email Service" (ej. Gmail).
// 3. Crea un "Email Template" con variables como {{to_name}} y {{otp_code}}.
// 4. Copia tus IDs aquí abajo.
// ==============================================================================

const SERVICE_ID = 'YOUR_SERVICE_ID'; // Ej: 'service_x93...'
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // Ej: 'template_a21...'
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';   // Ej: 'user_123...'

/**
 * Envía el código OTP al correo del usuario.
 * Si las credenciales no están configuradas, simula el envío en consola.
 */
export const sendOTPEmail = async (email: string, name: string, otp: string): Promise<boolean> => {
  // MODO SIMULACIÓN: Si no se han puesto las credenciales reales
  if (SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.group('🔐 [SIMULACIÓN DE ENVÍO DE EMAIL]');
    console.log(`📨 Enviando a: ${email}`);
    console.log(`👤 Usuario: ${name}`);
    console.log(`🔑 CÓDIGO OTP: ${otp}`);
    console.log('ℹ️ Para envío real, configura utils/email.ts con tus credenciales de EmailJS.');
    console.groupEnd();
    
    // Simulamos tiempo de red (1.5 segundos)
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
  }

  // MODO PRODUCCIÓN: Envío real
  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: email,
      to_name: name,
      otp_code: otp,
      message: `Tu código de recuperación es: ${otp}`,
    }, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email real:', error);
    // Fallback a simulación para no bloquear al usuario si falla el servicio
    console.log(`🔑 FALLBACK OTP (Copia este código): ${otp}`);
    return false; // Retornamos false para que la UI sepa que hubo un problema técnico real si se desea manejar
  }
};
