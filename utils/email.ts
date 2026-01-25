import emailjs from '@emailjs/browser';

// ==============================================================================
// CONFIGURACIÓN DE EMAILJS - PRODUCCIÓN
// ==============================================================================
const SERVICE_ID = 'service_qp2oakh'; 
const PUBLIC_KEY = 'r7u59Ac39JfGnqV0A'; 

// Identificadores de Plantillas (Templates)
const TEMPLATE_OTP = 'template_rosahxt';      // Para recuperación de contraseña
const TEMPLATE_LICENSE = 'template_v6oy3zm';  // Para nuevos leads/clientes

/**
 * Envía el código OTP de recuperación de contraseña.
 * Plantilla: Password Reset (template_rosahxt)
 */
export const sendOTPEmail = async (email: string, name: string, otp: string): Promise<boolean> => {
  try {
    // console.log(`🔄 Enviando OTP a ${email}...`); // Debug dev
    
    await emailjs.send(SERVICE_ID, TEMPLATE_OTP, {
      to_email: email, // Mapea al campo "To Email" en EmailJS
      to_name: name,   // Mapea a "{{to_name}}" en el cuerpo del correo
      otp_code: otp,   // Mapea a "{{otp_code}}" en el cuerpo del correo
    }, PUBLIC_KEY);

    return true;
  } catch (error) {
    console.error('❌ Error crítico enviando email (OTP):', error);
    // En caso de fallo de red, podrías implementar una lógica de reintento aquí o fallback
    return false; 
  }
};

/**
 * Envía la solicitud de licencia al administrador.
 * Plantilla: New License Request (template_v6oy3zm)
 */
export const sendLicenseRequestEmail = async (data: any): Promise<boolean> => {
  // Correo destino definido en la lógica de negocio (o en la plantilla por defecto)
  const adminEmail = 'admin@opulencia.pro'; 
  
  try {
    // console.log(`🔄 Enviando solicitud de licencia para ${data.businessName}...`); // Debug dev

    await emailjs.send(SERVICE_ID, TEMPLATE_LICENSE, {
      // Cabeceras
      to_email: adminEmail,
      
      // Variables del cuerpo del correo (coinciden con tu template)
      lead_name: data.name,          // {{lead_name}} - Nombre del interesado
      lead_business: data.businessName, // {{lead_business}} - Nombre del Negocio
      lead_email: data.email,        // {{lead_email}} - Correo del interesado
      lead_phone: data.phone,        // {{lead_phone}} - Teléfono (si está en el template)
      
      // Variable compuesta para detalles extra si el template usa {{lead_details}}
      lead_details: `DNI/NIT: ${data.dni} | Ubicación: ${data.city}, ${data.country} | Dirección: ${data.address}`,
      
      // Variable auxiliar por si el template usa {{name}} genérico en el header
      name: data.name 
    }, PUBLIC_KEY);

    return true;
  } catch (error) {
    console.error('❌ Error crítico enviando email (Licencia):', error);
    return false;
  }
};