import { COLECCIONES, ESTADOS } from '@rutasur/shared';

/**
 * Aplica un evento de estado al documento del envío.
 * Devuelve 'aplicado' | 'duplicado' | 'fuera-de-orden'.
 */
export async function aplicarEstado(db, evento) {
  const envios = db.collection(COLECCIONES.ENVIOS);

  const actual = await envios.findOne(
    { shipmentId: evento.shipmentId },
    { projection: { ultimaSecuencia: 1, historial: 1 } },
  );

  if (actual && evento.secuencia <= actual.ultimaSecuencia) {
    return 'fuera-de-orden';
  }

  const entradaHistorial = {
    eventId: evento.eventId,
    tipo: evento.tipo,
    ocurridoEn: new Date(evento.ocurridoEn),
    secuencia: evento.secuencia,
    motivo: evento.motivo ?? null,
    hubId: evento.hubId ?? null,
    zonaId: evento.zonaId ?? null,
    repartidorId: evento.repartidorId ?? null,
  };

  const set = {
    estado: evento.tipo,
    ultimaSecuencia: evento.secuencia,
    actualizadoEn: new Date(),
    hubId: evento.hubId ?? null,
    zonaId: evento.zonaId ?? null,
    repartidorId: evento.repartidorId ?? null,
  };

  if (evento.tipo === ESTADOS.ENTREGA_FALLIDA) {
    set.ultimoMotivo = evento.motivo ?? null;
  }

  const inc = {};
  if (evento.tipo === ESTADOS.ENTREGA_FALLIDA) inc['intentos.fallidos'] = 1;
  if (evento.tipo === ESTADOS.EN_REPARTO) inc['intentos.repartos'] = 1;

  const update = {
    $set: set,
    $push: { historial: entradaHistorial },
    $setOnInsert: { creadoEn: new Date(), shipmentId: evento.shipmentId },
  };
  if (Object.keys(inc).length > 0) update.$inc = inc;

  await envios.updateOne({ shipmentId: evento.shipmentId }, update, { upsert: true });
  return 'aplicado';
}

export async function aplicarPromesa(db, evento) {
  const envios = db.collection(COLECCIONES.ENVIOS);
  await envios.updateOne(
    { shipmentId: evento.shipmentId },
    {
      $set: {
        promesa: {
          venceEn: new Date(evento.venceEn),
          franja: evento.franja,
        },
      },
      $setOnInsert: {
        shipmentId: evento.shipmentId,
        creadoEn: new Date(),
        estado: 'PENDIENTE',
        ultimaSecuencia: 0,
        historial: [],
      },
    },
    { upsert: true },
  );
}

/**
 * Proyecta una decisión de reprogramación en el envío.
 * Usa upsert para no perder el evento si llega antes que el estado que lo originó.
 * @param {import('mongodb').Db} db
 * @param {object} evento
 */
const DECISION_POR_MOTIVO = {
  AUSENTE: 'REPROGRAMAR',
  DIRECCION_INCORRECTA: 'RETENIDO',
  RECHAZADO: 'DEVOLUCION',
  ZONA_INACCESIBLE: 'REINTENTO_MANUAL',
};

export async function aplicarReprogramacion(db, evento) {
  const envios = db.collection(COLECCIONES.ENVIOS);
  const reprogramacion = {
    decision: DECISION_POR_MOTIVO[evento.motivo] ?? 'REINTENTO_MANUAL',
    intento: evento.intento,
    motivo: evento.motivo,
    franja: evento.franja,
    actualizadoEn: new Date(),
  };

  await envios.updateOne(
    { shipmentId: evento.shipmentId },
    {
      $set: { reprogramacion },
      $setOnInsert: {
        shipmentId: evento.shipmentId,
        estado: 'ENTREGA_FALLIDA',
        secuencia: -1,
        historial: [],
        creadoEn: new Date(),
      },
    },
    { upsert: true },
  );
}

/**
 * Proyecta una alerta de SLA en la colección alertas.
 * @param {import('mongodb').Db} db
 * @param {object} evento
 */
export async function aplicarAlerta(db, evento) {
  await db.collection(COLECCIONES.ALERTAS).updateOne(
    { alertaId: evento.alertaId ?? evento.eventId },
    { $set: { ...evento, actualizadoEn: new Date() } },
    { upsert: true },
  );
}

/**
 * Registra una notificación simulada en la colección notificaciones.
 * @param {import('mongodb').Db} db
 * @param {object} evento
 */
export async function aplicarNotificacion(db, evento) {
  await db.collection(COLECCIONES.NOTIFICACIONES).updateOne(
    { eventId: evento.eventId },
    { $setOnInsert: { ...evento, registradaEn: new Date() } },
    { upsert: true },
  );
}
