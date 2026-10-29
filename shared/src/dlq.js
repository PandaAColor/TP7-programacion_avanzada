import { TOPICS } from './constants.js';
import { publicar } from './kafka.js';
import { randomUUID } from 'node:crypto';


/**
 * Publica el mensaje original en la DLQ con el motivo del rechazo.
 * @param {import('kafkajs').Producer} producer
 * @param {object} params
 */
export async function enviarADlq(producer, { topic, consumidor, crudo, motivo, partition, offset }) {
  const shipmentId =
    crudo && typeof crudo === 'object' && crudo.shipmentId
      ? String(crudo.shipmentId)
      : `desconocido-${partition}-${offset}`;

  const evento = {
    eventId: randomUUID(),
    shipmentId,
    tipo: 'DLQ',
    ocurridoEn: new Date().toISOString(),
    secuencia: 0,
    version: 1,
    payload: {
      topicOrigen: topic,
      consumidor,
      motivo,
      partition,
      offset,
      crudo,
    },
  };

  await publicar(producer, TOPICS.DLQ, evento);
}
