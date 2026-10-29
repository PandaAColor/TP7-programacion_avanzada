import { Kafka, logLevel, Partitioners } from 'kafkajs';

let cliente = null;
const conexiones = [];

/**
 * Registra un recurso para cerrarlo ordenadamente al apagar el proceso.
 * @param {{disconnect?: Function, close?: Function}} recurso
 */
export function registrarConexion(recurso) {
  conexiones.push(recurso);
}

/**
 * Cierra todos los recursos registrados, ignorando los que ya fallaron.
 */
export async function cerrarTodo() {
  await Promise.allSettled(
    conexiones.map((r) =>
      typeof r.disconnect === 'function' ? r.disconnect() : r.close(),
    ),
  );
  conexiones.length = 0;
}

export function obtenerKafka() {
  if (!cliente) {
    cliente = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'rutasur',
      brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
      logLevel: logLevel.WARN,
      retry: {
        retries: 20,
        initialRetryTime: 300,
        maxRetryTime: 10000,
      },
    });
  }
  return cliente;
}

export function crearProductor() {
  const productor = obtenerKafka().producer({
    allowAutoTopicCreation: false,
    createPartitioner: Partitioners.LegacyPartitioner,
  });
  registrarConexion(productor);
  return productor;
}

/**
 * Crea un consumidor con commit manual.
 * Acepta un groupId como string o como objeto { groupId }.
 * @param {string|{groupId: string}} grupo
 */
export function crearConsumidor(grupo) {
  const groupId = typeof grupo === 'string' ? grupo : grupo?.groupId;

  if (!groupId) {
    throw new Error('crearConsumidor requiere un groupId');
  }

  const consumidor = obtenerKafka().consumer({
    groupId,
    allowAutoTopicCreation: false,
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    retry: {
      initialRetryTime: 300,
      retries: 20,
      maxRetryTime: 10000,
    },
  });
  registrarConexion(consumidor);
  return consumidor;
}

export async function publicar(producer, topic, evento) {
  await producer.send({
    topic,
    messages: [
      {
        key: evento.shipmentId,
        value: JSON.stringify(evento),
        headers: { tipo: evento.tipo, version: String(evento.version) },
      },
    ],
  });
}
