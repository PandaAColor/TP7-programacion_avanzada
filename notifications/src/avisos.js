import { randomUUID } from 'node:crypto';

const TEXTOS = {
  AUSENTE: 'No pudimos entregar tu envío porque no había nadie. Podés reprogramar la entrega.',
  DIRECCION_INCORRECTA: 'No pudimos entregar tu envío: la dirección no es correcta. Contactanos para corregirla.',
  RECHAZADO: 'Tu envío fue rechazado en el domicilio. Se devolverá al comercio.',
  ZONA_INACCESIBLE: 'No pudimos acceder a la zona de entrega. Un supervisor revisará tu caso.',
};

/**
 * Arma la notificación simulada para una entrega fallida.
 * @param {object} evento
 * @returns {object}
 */
export function avisoPorFallo(evento) {
  return {
    eventId: randomUUID(),
    shipmentId: evento.shipmentId,
    tipo: 'NOTIFICACION_ENVIADA',
    canal: 'SIMULADO',
    plantilla: `FALLO_${evento.motivo}`,
    mensaje: TEXTOS[evento.motivo] ?? 'Hubo un problema con tu entrega.',
    permiteReprogramar: evento.motivo === 'AUSENTE',
    ocurridoEn: evento.ocurridoEn,
    secuencia: evento.secuencia,
    version: 1,
  };
}

/**
 * Arma la notificación simulada para una alerta de SLA.
 * @param {object} alerta
 * @returns {object}
 */
export function avisoPorAlerta(alerta) {
  return {
    eventId: randomUUID(),
    shipmentId: alerta.shipmentId,
    tipo: 'NOTIFICACION_ENVIADA',
    canal: 'SIMULADO',
    plantilla: `SLA_${alerta.prioridad}`,
    mensaje: `Tu envío tiene riesgo de demora (${alerta.prioridad}). Estamos trabajando en ello.`,
    permiteReprogramar: false,
    ocurridoEn: alerta.ocurridoEn,
    secuencia: alerta.secuencia ?? 0,
    version: 1,
  };
}
