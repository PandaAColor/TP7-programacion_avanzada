import {
  TOPICS,
  crearConsumidor,
  crearProductor,
  conectarMongo,
  crearLogger,
  parsearMensaje,
  validarEvento,
  registrarProcesado,
  yaProcesado,
  enviarADlq,
  publicar,
  cerrarTodo,
} from '@rutasur/shared';
import { avisoPorFallo, avisoPorAlerta } from './avisos.js';


const log = crearLogger('notifications');
const GROUP_ID = 'notificaciones';

async function main() {
  const db = await conectarMongo();

  const productor = crearProductor();
  await productor.connect();
  log.info('productor conectado');

  const consumidor = crearConsumidor(GROUP_ID);
  await consumidor.connect();
  await consumidor.subscribe({
    topics: [TOPICS.ESTADOS, TOPICS.ALERTAS_SLA],
    fromBeginning: true,
  });

  await consumidor.run({
    eachMessage: async ({ topic, partition, message }) => {
      const crudo = parsearMensaje(message.value);

            if (crudo === null) {
        await enviarADlq(productor, {
          topic,
          consumidor: GROUP_ID,
          crudo: null,
          motivo: 'JSON inválido',
          partition,
          offset: message.offset,
        });
        return;
      }

      const validacion = validarEvento(topic, crudo);
      if (!validacion.ok) {
        await enviarADlq(productor, {
          topic,
          consumidor: GROUP_ID,
          crudo,
          motivo: validacion.motivo,
          partition,
          offset: message.offset,
        });
        return;
      }

      const evento = crudo;
      const esFallo = topic === TOPICS.ESTADOS && evento.tipo === 'ENTREGA_FALLIDA';
      const esAlerta = topic === TOPICS.ALERTAS_SLA;

      if (!esFallo && !esAlerta) return;

      if (await yaProcesado(db, GROUP_ID, evento.eventId)) {
        log.info('evento ya procesado', { eventId: evento.eventId });
        return;
      }

      const aviso = esFallo ? avisoPorFallo(evento) : avisoPorAlerta(evento);

      await publicar(productor, TOPICS.NOTIFICACIONES, aviso);

      log.info('notificación enviada', {
        shipmentId: aviso.shipmentId,
        plantilla: aviso.plantilla,
      });

      await registrarProcesado(db, GROUP_ID, evento.eventId);
    },
  });

  log.info('consumidor iniciado', { groupId: GROUP_ID });
}

process.on('SIGTERM', async () => {
  await cerrarTodo();
  process.exit(0);
});

main().catch((error) => {
  log.error('fallo fatal', { error: error.message });
  process.exit(1);
});
