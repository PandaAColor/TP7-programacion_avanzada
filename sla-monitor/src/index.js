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
import { randomUUID } from 'node:crypto';

const log = crearLogger('sla-monitor');
const GROUP_ID = 'monitor-sla';

const COLECCION = 'sla_estado';
const COLECCION_ALERTAS = 'alertas';

const HORAS = 60 * 60 * 1000;
const MINUTOS = 60 * 1000;

/** Reglas de riesgo, con su prioridad según la especificación. */
const REGLAS = {
  SIN_INGRESO: { prioridad: 'MEDIA', horasLimite: 10 },
  SIN_SALIDA: { prioridad: 'ALTA', horasLimite: 4 },
  FALLO_DIA_LIMITE: { prioridad: 'ALTA' },
  VENCIDO: { prioridad: 'CRITICA' },
};

/**
 * Devuelve el estado interno de un envío, creándolo si no existe.
 * Se respalda en Mongo para sobrevivir reinicios del monitor.
 */
async function obtenerEstado(db, shipmentId) {
  const existente = await db.collection(COLECCION).findOne({ shipmentId });
  if (existente) return existente;

  const nuevo = {
    shipmentId,
    ultimoEstado: null,
    ocurridoEn: null,
    secuencia: -1,
    venceEn: null,
    intentos: 0,
    motivoFallo: null,
    alertasEmitidas: [],
    cerrado: false,
  };
  await db.collection(COLECCION).insertOne(nuevo);
  return nuevo;
}

/** Aplica un evento de estado al estado interno del envío. */
async function aplicarEstado(db, evento) {
  const estado = await obtenerEstado(db, evento.shipmentId);

  if (evento.secuencia <= estado.secuencia) return estado;

  estado.ultimoEstado = evento.tipo;
  estado.ocurridoEn = evento.ocurridoEn;
  estado.secuencia = evento.secuencia;

  if (evento.tipo === 'ENTREGA_FALLIDA') {
    estado.intentos += 1;
    estado.motivoFallo = evento.motivo ?? null;
  }

  if (evento.tipo === 'ENTREGADO') {
    estado.cerrado = true;
  }

  await db.collection(COLECCION).updateOne(
    { shipmentId: evento.shipmentId },
    {
      $set: {
        ultimoEstado: estado.ultimoEstado,
        ocurridoEn: estado.ocurridoEn,
        secuencia: estado.secuencia,
        intentos: estado.intentos,
        motivoFallo: estado.motivoFallo,
        cerrado: estado.cerrado,
      },
    },
  );

  return estado;
}

/** Aplica una promesa de entrega al estado interno. */
async function aplicarPromesa(db, evento) {
  const estado = await obtenerEstado(db, evento.shipmentId);
  estado.venceEn = evento.venceEn;

  await db.collection(COLECCION).updateOne(
    { shipmentId: evento.shipmentId },
    { $set: { venceEn: estado.venceEn } },
  );

  return estado;
}

/**
 * Evalúa las cuatro reglas sobre un envío y devuelve las que aplican.
 * `ahora` debe ser un número en milisegundos (reloj simulado).
 */
function evaluarReglas(estado, ahora) {
  const disparadas = [];
  if (estado.cerrado || !estado.venceEn) return disparadas;

  const vence = new Date(estado.venceEn).getTime();
  const restante = vence - ahora;
  const mismoDia = new Date(estado.venceEn).toISOString().slice(0, 10)
    === new Date(ahora).toISOString().slice(0, 10);

  if (restante < 0 && estado.ultimoEstado !== 'ENTREGADO') {
    disparadas.push('VENCIDO');
  }

  if (estado.ultimoEstado === 'ENTREGA_FALLIDA' && mismoDia) {
    disparadas.push('FALLO_DIA_LIMITE');
  }

  const sinSalida = ['EN_REPARTO', 'ENTREGADO', 'ENTREGA_FALLIDA'];
  const sinIngreso = ['INGRESADO_HUB', 'CLASIFICADO', ...sinSalida];

  if (
    restante > 0
    && restante < REGLAS.SIN_SALIDA.horasLimite * HORAS
    && !sinSalida.includes(estado.ultimoEstado)
  ) {
    disparadas.push('SIN_SALIDA');
  } else if (
    restante > 0
    && restante < REGLAS.SIN_INGRESO.horasLimite * HORAS
    && !sinIngreso.includes(estado.ultimoEstado)
  ) {
    disparadas.push('SIN_INGRESO');
  }

  return disparadas;
}

/** Emite la alerta si esa regla no se disparó antes para el envío. */
async function emitirAlerta(db, productor, estadoEnvio, regla, ahora) {
  if (estadoEnvio.alertasEmitidas.includes(regla)) return;

  const alerta = {
    eventId: randomUUID(),
    shipmentId: estadoEnvio.shipmentId,
    tipo: 'ALERTA_SLA',
    ocurridoEn: new Date(ahora).toISOString(),
    secuencia: 0,
    version: 1,
    alertaId: `${estadoEnvio.shipmentId}:${regla}`,
    regla,
    prioridad: REGLAS[regla].prioridad,
    estado: 'ABIERTA',
    venceEn: estadoEnvio.venceEn,
    ultimoEstado: estadoEnvio.ultimoEstado,
  };

  await publicar(productor, TOPICS.ALERTAS_SLA, alerta);

  await db.collection(COLECCION).updateOne(
    { shipmentId: estadoEnvio.shipmentId },
    { $push: { alertasEmitidas: regla } },
  );

  estadoEnvio.alertasEmitidas.push(regla);

  log.info('alerta emitida', {
    shipmentId: estadoEnvio.shipmentId,
    regla,
    prioridad: alerta.prioridad,
  });
}

/** Cierra las alertas abiertas del envío cuando llega ENTREGADO. */
async function cerrarAlertas(db, productor, estadoEnvio, ahora) {
  const abiertas = await db.collection(COLECCION_ALERTAS).find({
    shipmentId: estadoEnvio.shipmentId,
    estado: 'ABIERTA',
  }).toArray();

  for (const alerta of abiertas) {
    await publicar(productor, TOPICS.ALERTAS_SLA, {
      eventId: randomUUID(),
      shipmentId: estadoEnvio.shipmentId,
      tipo: 'ALERTA_SLA',
      ocurridoEn: new Date(ahora).toISOString(),
      secuencia: 0,
      version: 1,
      alertaId: alerta.alertaId,
      regla: alerta.regla,
      prioridad: alerta.prioridad,
      estado: 'CERRADA',
      venceEn: alerta.venceEn ?? estadoEnvio.venceEn,
      ultimoEstado: estadoEnvio.ultimoEstado,
    });
  }

  log.info('alertas cerradas', {
    shipmentId: estadoEnvio.shipmentId,
    cantidad: abiertas.length,
  });
}

/** Barrido periódico de todos los envíos abiertos. */
async function evaluarTodos(db, productor, ahora) {
  const abiertos = await db.collection(COLECCION)
    .find({ cerrado: false, venceEn: { $ne: null } })
    .toArray();

  log.info('barrido', { abiertos: abiertos.length, ahora });

  for (const estado of abiertos) {
    const reglas = evaluarReglas(estado, ahora);
    for (const regla of reglas) {
      await emitirAlerta(db, productor, estado, regla, ahora);
    }
  }
}

async function main() {
  const db = await conectarMongo();

  const productor = crearProductor();
  await productor.connect();
  log.info('productor conectado');

  // Reloj simulado: avanza con ocurridoEn de los eventos, nunca retrocede.
  let relojSimulado = Date.now();

  const consumidor = crearConsumidor(GROUP_ID);
  await consumidor.connect();
  await consumidor.subscribe({
    topics: [TOPICS.ESTADOS, TOPICS.PROMESAS],
    fromBeginning: true,
  });

  setInterval(async () => {
    try {
      await evaluarTodos(db, productor, relojSimulado);
    } catch (error) {
      log.error('fallo en barrido', { error: error.message });
    }
  }, MINUTOS);

  await consumidor.run({
    eachMessage: async ({ topic, partition, message }) => {
      const texto = message.value?.toString('utf8') ?? null;
      const crudo = parsearMensaje(message.value);

      if (crudo === null) {
        await enviarADlq(productor, {
          topic,
          consumidor: GROUP_ID,
          crudo: texto,
          motivo: 'PAYLOAD_NO_PARSEABLE',
          partition,
          offset: message.offset,
        });
        return;
      }

      const validacion = validarEvento(topic, crudo);
      if (!validacion.ok) {
        await enviarADlq(productor, {
          topic,
          consumidor: GROUP_ID,
          crudo: texto,
          motivo: `ESQUEMA_INVALIDO: ${validacion.motivo}`,
          partition,
          offset: message.offset,
        });
        return;
      }

      const evento = crudo;

      if (await yaProcesado(db, GROUP_ID, evento.eventId)) {
        log.info('evento ya procesado', { eventId: evento.eventId });
        return;
      }

      const ahora = new Date(evento.ocurridoEn).getTime();
      relojSimulado = Math.max(relojSimulado, ahora);

      let estado;
      if (topic === TOPICS.PROMESAS) {
        estado = await aplicarPromesa(db, evento);
      } else {
        estado = await aplicarEstado(db, evento);
      }

      if (evento.tipo === 'ENTREGADO') {
        await cerrarAlertas(db, productor, estado, ahora);
      } else {
        const reglas = evaluarReglas(estado, ahora);
        for (const regla of reglas) {
          await emitirAlerta(db, productor, estado, regla, ahora);
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
