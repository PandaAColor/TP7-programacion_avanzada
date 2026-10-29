import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '../../../lib/mongo.js';
import { formatearFecha } from '../../../lib/fechas.js';

export const dynamic = 'force-dynamic';

const COLOR_ESTADO = {
  CREADO: 'text-neutral-300',
  INGRESADO_HUB: 'text-sky-400',
  CLASIFICADO: 'text-sky-400',
  EN_REPARTO: 'text-amber-400',
  ENTREGADO: 'text-emerald-400',
  ENTREGA_FALLIDA: 'text-rose-400',
};

/**
 * Detalle de un envío con línea de tiempo, reprogramación, alertas y notificaciones.
 * @param {{params: Promise<{shipmentId: string}>}} props
 */
export default async function DetalleEnvio({ params }) {
  const { shipmentId } = await params;
  const db = await getDb();

  const [envio, alertas, notificaciones] = await Promise.all([
    db.collection('envios').findOne({ shipmentId }),
    db.collection('alertas').find({ shipmentId }).sort({ ocurridoEn: 1 }).toArray(),
    db.collection('notificaciones').find({ shipmentId }).sort({ ocurridoEn: 1 }).toArray(),
  ]);

  if (!envio) notFound();

  const intentos = envio.intentos ?? {};
  const repartos = Number(intentos.repartos ?? 0);
  const fallidos = Number(intentos.fallidos ?? 0);
  const totalIntentos = Number.isFinite(repartos + fallidos) ? repartos + fallidos : 0;

  const datos = [
    { etiqueta: 'Estado', valor: envio.estado?.replaceAll('_', ' ') ?? '—', clase: COLOR_ESTADO[envio.estado] },
    { etiqueta: 'Intentos', valor: String(totalIntentos) },
    { etiqueta: 'Repartos', valor: String(repartos) },
    { etiqueta: 'Fallidos', valor: String(fallidos), clase: fallidos > 0 ? 'text-rose-400' : undefined },
    { etiqueta: 'Zona', valor: envio.zonaId ?? '—' },
    { etiqueta: 'Hub', valor: envio.hubId ?? '—' },
    { etiqueta: 'Promesa', valor: formatearFecha(envio.promesa?.venceEn) },
  ];

  return (
    <main className="space-y-8">
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <Link href="/" className="hover:text-neutral-200">
          Torre de control
        </Link>
        <span>/</span>
        <span className="font-mono text-neutral-300">{envio.shipmentId}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">{envio.shipmentId}</h1>
        <Link
          href={`/tracking/${envio.shipmentId}`}
          className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800"
        >
          Ver tracking público
        </Link>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {datos.map((d) => (
          <div key={d.etiqueta} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              {d.etiqueta}
            </div>
            <div className={`mt-1 text-lg font-medium ${d.clase ?? ''}`}>{d.valor}</div>
          </div>
        ))}
      </section>

      {envio.reprogramacion && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-300">Reprogramación</h2>
          <p className="mt-1 text-sm text-neutral-300">
            {envio.reprogramacion.decision} · intento {envio.reprogramacion.intento} · motivo{' '}
            {envio.reprogramacion.motivo?.replaceAll('_', ' ')} · franja {envio.reprogramacion.franja}
          </p>
        </section>
      )}

      <section className="rounded-lg border border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Línea de tiempo</h2>
        </div>
        <ol className="divide-y divide-neutral-800/70">
          {(envio.historial ?? []).map((h) => (
            <li key={h.eventId} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="w-40 shrink-0 tabular-nums text-xs text-neutral-500">
                {formatearFecha(h.ocurridoEn)}
              </span>
              <span className={`font-medium ${COLOR_ESTADO[h.tipo] ?? 'text-neutral-200'}`}>
                {h.tipo?.replaceAll('_', ' ')}
              </span>
              {h.motivo && <span className="text-xs text-rose-300">{h.motivo.replaceAll('_', ' ')}</span>}
              <span className="ml-auto font-mono text-[11px] text-neutral-600">seq {h.secuencia}</span>
            </li>
          ))}
          {(envio.historial ?? []).length === 0 && (
            <li className="px-4 py-6 text-center text-neutral-500">Sin historial</li>
          )}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-neutral-800">
          <div className="border-b border-neutral-800 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Alertas</h2>
          </div>
          <ul className="divide-y divide-neutral-800/70 text-sm">
            {alertas.map((a) => (
              <li key={a.alertaId} className="flex items-center gap-3 px-4 py-2">
                <span
                  className={`text-xs font-medium ${
                    a.estado === 'ABIERTA' ? 'text-amber-300' : 'text-neutral-500'
                  }`}
                >
                  {a.estado}
                </span>
                <span className="text-neutral-300">{a.regla.replaceAll('_', ' ')}</span>
                <span className="ml-auto text-xs text-neutral-500">{a.prioridad}</span>
              </li>
            ))}
            {alertas.length === 0 && (
              <li className="px-4 py-6 text-center text-neutral-500">Sin alertas</li>
            )}
          </ul>
        </section>

        <section className="rounded-lg border border-neutral-800">
          <div className="border-b border-neutral-800 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Notificaciones
            </h2>
          </div>
          <ul className="divide-y divide-neutral-800/70 text-sm">
            {notificaciones.map((n) => (
              <li key={n.eventId} className="px-4 py-2">
                <div className="text-[11px] uppercase tracking-wide text-neutral-500">{n.plantilla}</div>
                <div className="text-neutral-300">{n.mensaje}</div>
              </li>
            ))}
            {notificaciones.length === 0 && (
              <li className="px-4 py-6 text-center text-neutral-500">Sin notificaciones</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
