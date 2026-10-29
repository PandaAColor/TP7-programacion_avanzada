import { getDb } from '../../../lib/mongo.js';

export const dynamic = 'force-dynamic';

/**
 * Convierte un documento de Mongo en un objeto serializable.
 * @param {Record<string, unknown>} doc
 * @returns {Record<string, unknown>}
 */
function serializar(doc) {
  const { _id, ...resto } = doc ?? {};
  return resto;
}

/**
 * Emite un snapshot de envíos, alertas y contadores por Server-Sent Events.
 * @param {Request} request
 * @returns {Response}
 */
export function GET(request) {
  const encoder = new TextEncoder();
  let cerrado = false;
  let timer;

  const stream = new ReadableStream({
    async start(controller) {
      const enviar = (datos) => {
        if (cerrado) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(datos)}\n\n`));
        } catch {
          cerrado = true;
        }
      };

      const cerrar = () => {
        if (cerrado) return;
        cerrado = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* ya cerrado por el cliente */
        }
      };

      const tick = async () => {
        if (cerrado) return;
        try {
          const db = await getDb();
          const [porEstado, alertas, ultimos, totalEnvios] = await Promise.all([
            db
              .collection('envios')
              .aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }])
              .toArray(),
            db
              .collection('alertas')
              .find({ estado: 'ABIERTA' })
              .sort({ prioridad: 1, actualizadoEn: -1 })
              .limit(20)
              .toArray(),
            db
              .collection('envios')
              .find({})
              .sort({ actualizadoEn: -1 })
              .limit(15)
              .toArray(),
            db.collection('envios').countDocuments(),
          ]);

          const contadores = Object.fromEntries(
            porEstado.map((e) => [e._id ?? 'SIN_ESTADO', e.total]),
          );

          enviar({
            tipo: 'snapshot',
            contadores,
            totalEnvios,
            alertas: alertas.map(serializar),
            ultimos: ultimos.map((e) => ({
              shipmentId: e.shipmentId,
              estado: e.estado,
              zonaId: e.zonaId,
              actualizadoEn: e.actualizadoEn?.toISOString() ?? null,
            })),
          });
        } catch (error) {
          enviar({ tipo: 'error', mensaje: String(error?.message ?? error) });
        }
      };

      await tick();
      timer = setInterval(tick, 1000);

      request.signal?.addEventListener('abort', cerrar);
    },
    cancel() {
      cerrado = true;
      clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
