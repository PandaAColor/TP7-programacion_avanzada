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
  cerrarTodo,
} from '@rutasur/shared';
import { franjaDe, diaDe, claveMetrica, incrementar, incrementosDe } from './agregados.js';
import { iniciarTiempos } from './tiempos.js';

const log = crearLogger('analytics');
const GROUP_ID = 'analitica';

async function main() {
  const db = await conectarMongo();

  //await db
  //  .collection('metricas_diarias')
  //  .createIndex({ fecha: 1, zonaId: 1, franja: 1 }, { unique: true, name: 'metrica_unica' });

  const productor = crearProductor();
  await productor.connect();

  const consumidor = crearConsumidor(GROUP_ID);
  await consumidor.connect();
  await consumidor.subscribe({ topic: TOPICS.ESTADOS, fromBeginning: true });

  iniciarTiempos(db).catch((error) => {
  console.error('fallo el consumidor de tiempos', error);
  process.exit(1);
  });

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
      if (await yaProcesado(db, GROUP_ID, evento.eventId)) return;

      const incrementos = incrementosDe(evento);

      if (incrementos) {
        const clave = claveMetrica({
          fecha: diaDe(evento.ocurridoEn),
          zonaId: evento.zonaId,
          hubId: evento.hubId,
          franja: franjaDe(evento.ocurridoEn),
        });

        try {
          await incrementar(db, clave, incrementos);

          if (evento.tipo === 'ENTREGA_FALLIDA') {
            const motivo = evento.motivo ?? 'SIN_MOTIVO';
            await db.collection('metricas_diarias').updateOne(
              { _id: clave },
              { $inc: { [`fallosPorMotivo.${motivo}`]: 1 } },
            );
          }

          log.info('metrica actualizada', { eventId: evento.eventId, tipo: evento.tipo, clave });
        } catch (error) {
          await enviarADlq(productor, { topic, partition, message }, `ERROR_METRICA: ${error.message}`);
          log.warn('evento enviado a DLQ por error de escritura', {
            eventId: evento.eventId,
            error: error.message,
          });
          return;
        }
      }


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
