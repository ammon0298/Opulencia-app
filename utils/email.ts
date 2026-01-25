
import emailjs from '@emailjs/browser';

// ==============================================================================
// CONFIGURACIÓN DE EMAIL (Reemplazar con tus datos reales de EmailJS)
// ==============================================================================
const SERVICE_ID = 'YOUR_SERVICE_ID'; 
const TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; 
const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';   

/**
 * Envía el código OTP al correo del usuario.
 */
export const sendOTPEmail = async (email: string, name: string, otp: string): Promise<boolean> => {
  if (SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.group('🔐 [SIMULACIÓN DE ENVÍO DE EMAIL - OTP]');
    console.log(`📨 Enviando a: ${email}`);
    console.log(`👤 Usuario: ${name}`);
    console.log(`🔑 CÓDIGO OTP: ${otp}`);
    console.groupEnd();
    await new Promise(resolve => setTimeout(resolve, 1500));
    return true;
  }

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
    return false; 
  }
};

/**
 * Envía la solicitud de licencia al administrador (admin@opulencia.com).
 */
export const sendLicenseRequestEmail = async (data: any): Promise<boolean> => {
  const adminEmail = 'admin@opulencia.pro';
  
  if (SERVICE_ID === 'YOUR_SERVICE_ID') {
    console.group('💼 [NUEVA SOLICITUD DE LICENCIA]');
    console.log(`📨 Para: ${adminEmail}`);
    console.log('--- DATOS DEL INTERESADO ---');
    console.log(`👤 Nombre: ${data.name}`);
    console.log(`🏢 Negocio: ${data.businessName}`);
    console.log(`📧 Email: ${data.email}`);
    console.log(`📱 Teléfono: ${data.phone}`);
    console.log(`🆔 DNI/NIT: ${data.dni}`);
    console.log(`📍 Ubicación: ${data.city}, ${data.country}`);
    console.log(`🏠 Dirección: ${data.address}`);
    console.groupEnd();
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simular proceso de red
    return true;
  }

  try {
    // Asume que tienes un template configurado para recibir estos datos
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: adminEmail,
      subject: 'Nueva Solicitud de Licencia Opulencia',
      lead_name: data.name,
      lead_business: data.businessName,
      lead_email: data.email,
      lead_phone: data.phone,
      lead_details: `DNI: ${data.dni} | Ubicación: ${data.city}, ${data.country}`,
    }, PUBLIC_KEY);
    return true;
  } catch (error) {
    console.error('❌ Error enviando solicitud:', error);
    return false;
  }
};
