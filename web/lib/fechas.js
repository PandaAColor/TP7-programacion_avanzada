const ZONA = 'America/Argentina/Buenos_Aires';

/**
 * Formatea una fecha ISO en la zona horaria del operador.
 * @param {string | Date | null | undefined} valor
 * @param {'corta' | 'hora'} estilo
 * @returns {string}
 */
export function formatearFecha(valor, estilo = 'corta') {
  if (!valor) return '—';
  const fecha = new Date(valor);
  return estilo === 'hora'
    ? fecha.toLocaleTimeString('es-AR', { timeZone: ZONA })
    : fecha.toLocaleString('es-AR', { timeZone: ZONA });
}
