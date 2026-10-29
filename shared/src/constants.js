export const TOPICS = {
  ESTADOS: 'envios.estados',
  PROMESAS: 'envios.promesas',
  REPROGRAMACIONES: 'envios.reprogramaciones',
  ALERTAS_SLA: 'alertas.sla',
  NOTIFICACIONES: 'notificaciones.enviadas',
  DLQ: 'envios.estados.dlq',
};

export const GRUPOS = {
  PROYECTOR: 'proyector',
  NOTIFICACIONES: 'notificaciones',
  REPROGRAMACION: 'reprogramacion',
  MONITOR_SLA: 'monitor-sla',
  ANALITICA: 'analitica',
  ANALITICA_REPLAY: 'analitica-replay',
  TIEMPOS: 'analitica_tiempos'
};

export const ESTADOS = {
  CREADO: 'CREADO',
  INGRESADO_HUB: 'INGRESADO_HUB',
  CLASIFICADO: 'CLASIFICADO',
  EN_REPARTO: 'EN_REPARTO',
  ENTREGADO: 'ENTREGADO',
  ENTREGA_FALLIDA: 'ENTREGA_FALLIDA',
};

export const MOTIVOS = {
  AUSENTE: 'AUSENTE',
  DIRECCION_INCORRECTA: 'DIRECCION_INCORRECTA',
  RECHAZADO: 'RECHAZADO',
  ZONA_INACCESIBLE: 'ZONA_INACCESIBLE',
};

export const PRIORIDADES = {
  MEDIA: 'MEDIA',
  ALTA: 'ALTA',
  CRITICA: 'CRITICA',
};

export const REGLAS_SLA = {
  SIN_INGRESO: 'SIN_INGRESO',
  SIN_SALIDA: 'SIN_SALIDA',
  FALLO_DIA_LIMITE: 'FALLO_DIA_LIMITE',
  VENCIDO: 'VENCIDO',
};

export const SCHEMA_VERSION = 1;

export const COLECCIONES = {
  ENVIOS: 'envios',
  ALERTAS: 'alertas',
  NOTIFICACIONES: 'notificaciones',
  METRICAS: 'metricas_diarias',
  EVENTOS_PROCESADOS: 'eventos_procesados',
  SLA_ESTADO: 'sla_estado',
  METRICAS_HUB: 'metricas_hub',
};
