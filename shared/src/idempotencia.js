import { COLECCIONES } from './constants.js';

/**
 * Intenta registrar un eventId para un consumidor.
 * Devuelve false si ya estaba registrado (duplicado).
 * @param {import('mongodb').Db} db
 * @param {string} consumidor
 * @param {string} eventId
 */
export async function registrarProcesado(db, consumidor, eventId) {
  const col = db.collection(COLECCIONES.EVENTOS_PROCESADOS);
  try {
    await col.insertOne({
      consumidor,
      eventId,
      creadoEn: new Date(),
    });
    return true;
  } catch (err) {
    if (err.code === 11000) return false;
    throw err;
  }
}

export async function asegurarIndicesIdempotencia(db) {
  const col = db.collection(COLECCIONES.EVENTOS_PROCESADOS);
  await col.createIndex({ consumidor: 1, eventId: 1 }, { unique: true });
  await col.createIndex({ creadoEn: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
}

/**
 * Indica si un consumidor ya procesó un eventId.
 * @param {import('mongodb').Db} db
 * @param {string} consumidor
 * @param {string} eventId
 * @returns {Promise<boolean>}
 */
export async function yaProcesado(db, consumidor, eventId) {
  const col = db.collection(COLECCIONES.EVENTOS_PROCESADOS);
  const doc = await col.findOne({ consumidor, eventId }, { projection: { _id: 1 } });
  return doc !== null;
}
