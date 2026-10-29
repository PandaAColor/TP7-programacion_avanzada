import {
  GRUPOS,
  TOPICS,
  crearProductor,
  crearLogger,
  conectarMongo,
  asegurarIndicesIdempotencia,
} from '@rutasur/shared';
import { asegurarIndices } from './indices.js';
import { crearConsumidorProyector } from './consumidor.js';

const logger = crearLogger('projector');

async function main() {
  const db = await conectarMongo();
  await asegurarIndices(db);
  await asegurarIndicesIdempotencia(db);

  const producer = crearProductor();
  await producer.connect();

  const consumidor = crearConsumidorProyector({
    groupId: GRUPOS.PROYECTOR,
    topics: [
      TOPICS.ESTADOS,
      TOPICS.PROMESAS,
      TOPICS.REPROGRAMACIONES,
      TOPICS.ALERTAS_SLA,
      TOPICS.NOTIFICACIONES,
    ],
    db,
    producer,
    logger,
  });
  logger.info('debug index', { topics: consumidor.topics });
  await consumidor.iniciar();


  logger.info('proyector listo', { topics: consumidor.topics.length });

  const apagar = async () => {
    logger.info('apagando proyector');
    await consumidor.detener();
    await producer.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

main().catch((err) => {
  logger.error('fallo al iniciar', { error: err.message, stack: err.stack });
  process.exit(1);
});
