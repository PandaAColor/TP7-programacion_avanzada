import { COLECCIONES } from '@rutasur/shared';

export async function asegurarIndices(db) {
  const envios = db.collection(COLECCIONES.ENVIOS);
  await envios.createIndex({ shipmentId: 1 }, { unique: true });
  await envios.createIndex({ estado: 1, zonaId: 1 });
  await envios.createIndex({ 'promesa.venceEn': 1 });

  const alertas = db.collection(COLECCIONES.ALERTAS);
  await alertas.createIndex({ estado: 1, prioridad: 1 });
  await alertas.createIndex({ shipmentId: 1 });

  const notificaciones = db.collection(COLECCIONES.NOTIFICACIONES);
  await notificaciones.createIndex({ shipmentId: 1 });
  await notificaciones.createIndex({ eventId: 1 }, { unique: true });
}
