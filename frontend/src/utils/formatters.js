import { format } from 'date-fns';
import es from 'date-fns/locale/es';

/**
 * Formatea un monto en CLP con puntos como separador de miles
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Formatea una fecha de forma legible
 */
export function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'dd MMM yyyy', { locale: es });
}

/**
 * Formatea fecha y hora
 */
export function formatDateTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'dd MMM yyyy, HH:mm', { locale: es });
}

/**
 * Obtiene el mes y año de una fecha
 */
export function getMonthYear(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return format(date, 'MMMM yyyy', { locale: es });
}

