import { z } from 'zod';
import { ESTADOS, MOTIVOS, PRIORIDADES, REGLAS_SLA } from './constants.js';

const isoDate = z.string().datetime({ offset: true });

export const sobreBase = z.object({
  eventId: z.string().uuid(),
  shipmentId: z.string().min(1),
  tipo: z.string().min(1),
  ocurridoEn: isoDate,
  secuencia: z.number().int().nonnegative(),
  version: z.number().int().positive(),
  hubId: z.string().min(1).optional(),
  zonaId: z.string().min(1).optional(),
  repartidorId: z.string().min(1).optional(),
});

export const eventoEstado = sobreBase.extend({
  tipo: z.enum(Object.values(ESTADOS)),
  motivo: z.enum(Object.values(MOTIVOS)).optional(),
}).refine(
  (e) => e.tipo !== ESTADOS.ENTREGA_FALLIDA || Boolean(e.motivo),
  { message: 'ENTREGA_FALLIDA requiere motivo', path: ['motivo'] },
);

export const eventoPromesa = sobreBase.extend({
  tipo: z.literal('PROMESA'),
  venceEn: isoDate,
  franja: z.enum(['MANANA', 'TARDE']),
});

export const eventoReprogramacion = sobreBase.extend({
  tipo: z.literal('REPROGRAMACION'),
  intento: z.number().int().min(1),
  motivo: z.enum(Object.values(MOTIVOS)),
  franja: z.enum(['MANANA', 'TARDE']),
});


export const eventoAlertaSla = sobreBase.extend({
  tipo: z.literal('ALERTA_SLA'),
  alertaId: z.string().min(1),
  regla: z.enum(Object.values(REGLAS_SLA)),
  prioridad: z.enum(Object.values(PRIORIDADES)),
  estado: z.enum(['ABIERTA', 'CERRADA']),
  venceEn: z.string().datetime().optional(),
  ultimoEstado: z.string().optional(),
});


export const eventoNotificacion = sobreBase.extend({
  tipo: z.literal('NOTIFICACION_ENVIADA'),
  canal: z.literal('SIMULADO'),
  plantilla: z.string().min(1),
  mensaje: z.string().min(1),
});

export const esquemasPorTopic = {
  'envios.estados': eventoEstado,
  'envios.promesas': eventoPromesa,
  'envios.reprogramaciones': eventoReprogramacion,
  'alertas.sla': eventoAlertaSla,
  'notificaciones.enviadas': eventoNotificacion,
};
