import { ESTADOS, MOTIVOS, SCHEMA_VERSION } from '@rutasur/shared';

/**
 * Crea la definición de un envío con su plan de estados.
 */
export function crearEnvio({ aleatorio, config, reloj, indice }) {
  const hubId = aleatorio.elegir(config.hubs);
  const zonaId = aleatorio.elegir(config.zonas);
  const repartidorId = `R-${aleatorio.entero(1, 120)}`;
  const franja = aleatorio.elegir(config.franjas);

  const creado = reloj.ahora();
  const venceEn = new Date(creado.getTime() + 24 * 60 * 60 * 1000);

  return {
    shipmentId: `S-${String(indice).padStart(6, '0')}-${Math.floor(aleatorio.numero() * 1e6)}`,
    hubId,
    zonaId,
    repartidorId,
    franja,
    venceEn,
    creadoEn: creado,
    secuencia: 0,
    intentos: 0,
    demorado: aleatorio.probabilidad(config.probabilidadDemoraHub),
    tasaFallo: config.tasaFalloPorZona[zonaId] ?? 0.10,
  };
}

/**
 * Construye el sobre de evento con los campos comunes.
 */
export function sobre(envio, tipo, reloj, extra = {}) {
  envio.secuencia += 1;
  return {
    eventId: crypto.randomUUID(),
    shipmentId: envio.shipmentId,
    tipo,
    ocurridoEn: reloj.iso(),
    secuencia: envio.secuencia,
    version: SCHEMA_VERSION,
    hubId: envio.hubId,
    zonaId: envio.zonaId,
    repartidorId: envio.repartidorId,
    ...extra,
  };
}

export function promesa(envio, reloj) {
  return {
    eventId: crypto.randomUUID(),
    shipmentId: envio.shipmentId,
    tipo: 'PROMESA',
    ocurridoEn: reloj.iso(),
    secuencia: 0,
    version: SCHEMA_VERSION,
    hubId: envio.hubId,
    zonaId: envio.zonaId,
    venceEn: envio.venceEn.toISOString(),
    franja: envio.franja,
  };
}

/**
 * Decide el resultado del intento actual.
 */
export function resultadoIntento(envio, aleatorio, config) {
  if (envio.intentos >= 3) return { tipo: ESTADOS.ENTREGA_FALLIDA, motivo: MOTIVOS.AUSENTE };
  if (aleatorio.probabilidad(envio.tasaFallo)) {
    return { tipo: ESTADOS.ENTREGA_FALLIDA, motivo: aleatorio.motivo(config.distribucionMotivos) };
  }
  return { tipo: ESTADOS.ENTREGADO };
}
