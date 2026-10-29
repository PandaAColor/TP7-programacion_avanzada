import {
  GRUPOS,
  TOPICS,
  crearConsumidor,
  parsearMensaje,
  validarEvento,
  registrarProcesado,
  enviarADlq,
} from '@rutasur/shared';
import {
  aplicarEstado,
  aplicarPromesa,
  aplicarReprogramacion,
  aplicarAlerta,
  aplicarNotificacion,
} from './estados.js';

const HANDLERS = {
  [TOPICS.ESTADOS]: aplicarEstado,
  [TOPICS.PROMESAS]: aplicarPromesa,
  [TOPICS.REPROGRAMACIONES]: aplicarReprogramacion,
  [TOPICS.ALERTAS_SLA]: aplicarAlerta,
  [TOPICS.NOTIFICACIONES]: aplicarNotificacion,
};

/**
 * Crea el consumidor del grupo proyector, suscripto a los topics del catálogo.
 * Un solo miembro por grupo: evita el rebalanceo continuo de kafkajs.
 * Commit manual, solo después de escribir en Mongo.
 */
export function crearConsumidorProyector({ groupId, topics, db, producer, logger }) {
  const consumer = crearConsumidor(groupId);

  return {
    topics,

    async iniciar() {
      await consumer.connect();
      await consumer.subscribe({ topics });
      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const offset = message.offset;

          const handler = HANDLERS[topic];
          if (!handler) {
            await enviarADlq(producer, {
              topic,
              consumidor: groupId,
              crudo: message.value?.toString('utf8') ?? null,
              motivo: 'TOPIC_SIN_HANDLER',
              partition,
              offset,
            });
            return;
          }

          const evento = parsearMensaje(message.value);
          if (!evento) {
            await enviarADlq(producer, {
              topic,
              consumidor: groupId,
              crudo: message.value?.toString('utf8') ?? null,
              motivo: 'PAYLOAD_NO_PARSEABLE',
              partition,
              offset,
            });
            return;
          }

          const validacion = validarEvento(topic, evento);
          if (!validacion.ok) {
            await enviarADlq(producer, {
              topic,
              consumidor: groupId,
              crudo: message.value?.toString('utf8') ?? null,
              motivo: `ESQUEMA_INVALIDO: ${validacion.motivo}`,
              partition,
              offset,
            });
            return;
          }

          await handler(db, evento);
          await registrarProcesado(db, groupId, evento.eventId);

          logger.info('evento aplicado', {
            topic,
            partition,
            offset,
            shipmentId: evento.shipmentId,
            tipo: evento.tipo,
          });
        },
      });


    },

    async detener() {
      await consumer.stop();
    },
  };
}
