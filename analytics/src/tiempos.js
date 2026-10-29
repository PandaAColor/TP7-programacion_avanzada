import { TOPICS, GRUPOS, crearConsumidor } from '@rutasur/shared';

const ESTADOS_TIEMPO = ['INGRESADO_HUB', 'EN_REPARTO'];

/**
 * Consumidor de replay: tiempo medio entre INGRESADO_HUB y EN_REPARTO por hub.
 * @param {import('mongodb').Db} db conexión ya abierta a MongoDB.
 * @returns {Promise<void>}
 */
export async function iniciarTiempos(db) {
  const consumidor = crearConsumidor(GRUPOS.ANALITICA_REPLAY);
  await consumidor.connect();
  await consumidor.subscribe({ topic: TOPICS.ESTADOS, fromBeginning: true });

  const coleccion = db.collection('metricas_tiempos');
  const pendientes = new Map();

  await consumidor.run({
    eachMessage: async ({ message }) => {
      const evento = JSON.parse(message.value.toString());
      if (!ESTADOS_TIEMPO.includes(evento.tipo)) return;

      if (evento.tipo === 'INGRESADO_HUB') {
        pendientes.set(evento.shipmentId, evento.ocurridoEn);
        return;
      }

      const ingreso = pendientes.get(evento.shipmentId);
      if (!ingreso) return;
      pendientes.delete(evento.shipmentId);

      const minutos = (new Date(evento.ocurridoEn) - new Date(ingreso)) / 60000;
      if (!Number.isFinite(minutos) || minutos < 0) return;

      await coleccion.updateOne(
        { _id: evento.hubId ?? 'sin-hub' },
        {
          $inc: { muestras: 1, sumaMinutos: minutos },
          $setOnInsert: { hubId: evento.hubId ?? 'sin-hub' },
        },
        { upsert: true },
      );
    },
  });
}
