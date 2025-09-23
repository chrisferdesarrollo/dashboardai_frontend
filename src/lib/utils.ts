import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número de teléfono para mostrar con código de país separado
 * @param phone - Número de teléfono (puede incluir o no el +)
 * @returns Número formateado con código de país separado
 */
export function formatPhoneNumber(phone: string | undefined): string {
  if (!phone) return 'No especificado';
  
  // Limpiar el número (remover espacios, guiones, etc.)
  let cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Agregar + si no lo tiene
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+${cleanPhone}`;
  }
  
  // Patrones comunes de códigos de país (puedes expandir esto)
  const countryCodePatterns = [
    // Colombia (+57)
    { pattern: /^\+57(\d{10})$/, format: '+57 $1' },
    // México (+52)
    { pattern: /^\+52(\d{10})$/, format: '+52 $1' },
    // Estados Unidos/Canadá (+1)
    { pattern: /^\+1(\d{10})$/, format: '+1 $1' },
    // España (+34)
    { pattern: /^\+34(\d{9})$/, format: '+34 $1' },
    // Argentina (+54)
    { pattern: /^\+54(\d{10,11})$/, format: '+54 $1' },
    // Otros países de 2 dígitos
    { pattern: /^\+(\d{2})(\d+)$/, format: '+$1 $2' },
    // Otros países de 3 dígitos
    { pattern: /^\+(\d{3})(\d+)$/, format: '+$1 $2' },
  ];
  
  // Intentar hacer match con los patrones
  for (const { pattern, format } of countryCodePatterns) {
    const match = cleanPhone.match(pattern);
    if (match) {
      return format.replace(/\$(\d+)/g, (_, num) => match[parseInt(num)]);
    }
  }
  
  // Si no hay match, formatear de manera genérica
  const match = cleanPhone.match(/^\+(\d{1,3})(\d+)$/);
  if (match) {
    return `+${match[1]} ${match[2]}`;
  }
  
  // Si todo falla, devolver el número original
  return cleanPhone;
}

/**
 * Formatea específicamente números colombianos con separadores adicionales
 * @param phone - Número de teléfono
 * @returns Número formateado con separadores (ej: +57 310 547 1106)
 */
export function formatColombianPhoneNumber(phone: string | undefined): string {
  if (!phone) return 'No especificado';
  
  let cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  if (!cleanPhone.startsWith('+')) {
    cleanPhone = `+${cleanPhone}`;
  }
  
  // Patrón específico para Colombia (+57)
  const colombianPattern = /^\+57(\d{3})(\d{3})(\d{4})$/;
  const match = cleanPhone.match(colombianPattern);
  
  if (match) {
    return `+57 ${match[1]} ${match[2]} ${match[3]}`;
  }
  
  // Si no es colombiano, usar formato genérico
  return formatPhoneNumber(phone);
}
