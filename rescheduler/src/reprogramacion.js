import { randomUUID } from 'node:crypto';
import { MOTIVOS } from '@rutasur/shared';

/**
 * Decide el próximo intento tras una entrega fallida.
 * @param {object} evento evento ENTREGA_FALLIDA
 * @param {object|null} envio documento actual del envío
 * @returns {{accion: string, reprogramacion?: object, motivo: string}}
 */
export function decidirReprogramacion(evento, envio) {
  const intentosPrevios = envio?.intentos ?? 0;
  const numeroIntento = intentosPrevios + 1;
  const motivo = evento.motivo;

  if (numeroIntento >= 3) {
    return {
      accion: 'DEVOLUCION',
      motivo: `tercer intento fallido (${motivo})`,
    };
  }

  switch (motivo) {
        case MOTIVOS.AUSENTE:
      return {
        accion: 'REPROGRAMAR',
        motivo: 'ausente: nuevo intento al día hábil siguiente',
        reprogramacion: {
          eventId: randomUUID(),
          shipmentId: evento.shipmentId,
          tipo: 'REPROGRAMACION',
          intento: numeroIntento,
          motivo,
          franja: franjaOpuesta(evento.franja),
          ocurridoEn: evento.ocurridoEn,
          secuencia: evento.secuencia,
          hubId: evento.hubId,
          zonaId: evento.zonaId,
          repartidorId: evento.repartidorId,
          version: 1,
        },
      };

    case MOTIVOS.DIRECCION_INCORRECTA:
      return {
        accion: 'RETENIDO',
        motivo: 'dirección incorrecta: retenido hasta corrección',
      };

    case MOTIVOS.RECHAZADO:
      return {
        accion: 'DEVOLUCION',
        motivo: 'rechazado por el destinatario',
      };

    case MOTIVOS.ZONA_INACCESIBLE:
      return {
        accion: 'REINTENTO_MANUAL',
        motivo: 'zona inaccesible: requiere decisión del supervisor',
      };

    default:
      return {
        accion: 'REINTENTO_MANUAL',
        motivo: `motivo desconocido: ${motivo}`,
      };
  }
}

/**
 * Devuelve la franja opuesta a la del fallo.
 * @param {string|undefined} franja
 */
export function franjaOpuesta(franja) {
  return franja === 'MANANA' ? 'TARDE' : 'MANANA';
}
