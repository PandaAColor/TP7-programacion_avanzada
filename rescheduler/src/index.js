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
import { decidirReprogramacion } from './reprogramacion.js';

const log = crearLogger('rescheduler');
const GROUP_ID = 'reprogramacion';

async function main() {
  const db = await conectarMongo();
  const envios = db.collection('envios');

  const productor = crearProductor();
  await productor.connect();
  log.info('productor conectado');

  const consumidor = crearConsumidor(GROUP_ID);
  await consumidor.connect();
  await consumidor.subscribe({ topic: TOPICS.ESTADOS, fromBeginning: true });

  await consumidor.run({
    eachMessage: async ({ topic, partition, message }) => {
      const crudo = parsearMensaje(message.value);

      if (crudo === null) {
        await enviarADlq(productor, { topic, partition, message }, 'JSON inválido');
        return;
      }

      const validacion = validarEvento(topic, crudo);
      if (!validacion.ok) {
        await enviarADlq(productor, { topic, partition, message }, validacion.motivo);
        return;
      }

      const evento = crudo;
      if (evento.tipo !== 'ENTREGA_FALLIDA') return;

      if (await yaProcesado(db, GROUP_ID, evento.eventId)) {
        log.info('evento ya procesado', { eventId: evento.eventId });
        return;
      }

      const envio = await envios.findOne({ shipmentId: evento.shipmentId });
      const decision = decidirReprogramacion(evento, envio);

      log.info('decisión de reprogramación', {
        shipmentId: evento.shipmentId,
        motivo: evento.motivo,
        accion: decision.accion,
        detalle: decision.motivo,
      });

      if (decision.accion === 'REPROGRAMAR') {
        await publicar(productor, TOPICS.REPROGRAMACIONES, decision.reprogramacion);
      }

      await registrarProcesado(db, GROUP_ID, evento.eventId);
    },
  });

  log.info('consumidor iniciado', { groupId: GROUP_ID, topic: TOPICS.ESTADOS });
}

process.on('SIGTERM', async () => {
  await cerrarTodo();
  process.exit(0);
});

main().catch((error) => {
  log.error('fallo fatal', { error: error.message });
  process.exit(1);
});
