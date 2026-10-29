import { crearProductor, crearLogger } from '@rutasur/shared';
import { config } from './config.js';
import { RelojSimulado } from './reloj.js';
import { Aleatorio } from './aleatorio.js';
import { Simulador } from './simulador.js';
import { crearApi } from './api.js';

const logger = crearLogger('simulator');

async function main() {
  const producer = crearProductor();
  await producer.connect();
  logger.info('productor conectado', { brokers: process.env.KAFKA_BROKERS });

  const reloj = new RelojSimulado(config.aceleracion);
  const aleatorio = new Aleatorio(config.seed);

  logger.info('reloj simulado iniciado', {
    semilla: config.seed,
    aceleracion: config.aceleracion,
    enviosPorMinuto: config.enviosPorMinuto,
    ahora: reloj.iso(),
  });

  const simulador = new Simulador({ producer, reloj, aleatorio, config, logger });

  crearApi({ simulador, logger, puerto: config.apiPort });

  const apagar = async () => {
    logger.info('apagando simulador');
    simulador.detener();
    await producer.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);

  await simulador.flujoContinuo();
}

main().catch((err) => {
  logger.error('fallo al iniciar', { error: err.message, stack: err.stack });
  process.exit(1);
});
