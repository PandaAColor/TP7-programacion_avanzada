/**
 * Devuelve la franja horaria a partir de la hora del evento.
 * @param {string|Date} ocurridoEn
 * @returns {'MANANA'|'TARDE'|'NOCHE'}
 */
export function franjaDe(ocurridoEn) {
  const fecha = new Date(ocurridoEn);
  if (Number.isNaN(fecha.getTime())) return 'DESCONOCIDA';
  const hora = fecha.getHours();
  if (hora < 12) return 'MANANA';
  if (hora < 18) return 'TARDE';
  return 'NOCHE';
}

/**
 * Devuelve el día (YYYY-MM-DD) del evento.
 * @param {string|Date} ocurridoEn
 * @returns {string}
 */
export function diaDe(ocurridoEn) {
  const fecha = new Date(ocurridoEn);
  if (Number.isNaN(fecha.getTime())) return 'SIN_FECHA';
  return fecha.toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

/**
 * Construye la clave del documento de métricas, sin valores nulos.
 * @param {{fecha: string, zonaId?: string, hubId?: string, franja: string}} partes
 * @returns {{fecha: string, zonaId: string, hubId: string, franja: string}}
 */
export function claveMetrica({ fecha, zonaId, hubId, franja }) {
  return {
    fecha: fecha ?? 'SIN_FECHA',
    zonaId: zonaId ?? 'SIN_ZONA',
    hubId: hubId ?? 'SIN_HUB',
    franja: franja ?? 'DESCONOCIDA',
  };
}

/**
 * Aplica un incremento atómico sobre metricas_diarias.
 * @param {import('mongodb').Db} db
 * @param {object} clave
 * @param {object} campos
 * @returns {Promise<void>}
 */
export async function incrementar(db, clave, campos) {
  const coleccion = db.collection('metricas_diarias');

  const set = {};
  const inc = {};

  for (const [campo, valor] of Object.entries(campos)) {
    if (campo === 'fallosPorMotivo') {
      set.fallosPorMotivo = valor;
    } else {
      inc[campo] = valor;
    }
  }

  await coleccion.updateOne(
    { _id: clave },
    {
      ...(Object.keys(inc).length ? { $inc: inc } : {}),
      ...(Object.keys(set).length ? { $set: set } : {}),
      $setOnInsert: { creadoEn: new Date() },
    },
    { upsert: true },
  );
}


/**
 * Arma los incrementos que corresponden a un evento de estado.
 * @param {object} evento
 * @returns {object|null}
 */
export function incrementosDe(evento) {
  if (evento.tipo === 'ENTREGA_FALLIDA') {
    return { fallos: 1 };
  }

  if (evento.tipo === 'ENTREGADO') {
    const inc = { entregados: 1, aTiempo: evento.aTiempo === false ? 0 : 1 };
    if ((evento.intentos ?? 1) === 1) inc.entregadosPrimerIntento = 1;
    return inc;
  }

  return null;
}