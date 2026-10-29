import { getDb } from '../../lib/mongo.js';

export const dynamic = 'force-dynamic';

/**
 * Panel analítico con los tres indicadores de CU4 y el indicador de replay.
 * @param {{searchParams: Promise<{zonaId?: string, desde?: string, hasta?: string}>}} props
 */
export default async function Analitica({ searchParams }) {
  const { zonaId, desde, hasta } = await searchParams;
  const db = await getDb();

  const filtro = {};
  if (zonaId) filtro['_id.zonaId'] = zonaId;
  if (desde || hasta) {
    filtro['_id.fecha'] = {};
    if (desde) filtro['_id.fecha'].$gte = desde;
    if (hasta) filtro['_id.fecha'].$lte = hasta;
  }

  const [porZonaFranja, porMotivo, porHub, porTiempos] = await Promise.all([
    db.collection('metricas_diarias').aggregate([
      { $match: filtro },
      {
        $group: {
          _id: { zonaId: '$_id.zonaId', franja: '$_id.franja' },
          entregados: { $sum: '$entregados' },
          primerIntento: { $sum: '$entregadosPrimerIntento' },
          fallos: { $sum: '$fallos' },
        },
      },
      { $sort: { '_id.zonaId': 1, '_id.franja': 1 } },
    ]).toArray(),
    db.collection('metricas_diarias').aggregate([
      { $match: filtro },
      { $project: { zonaId: '$_id.zonaId', pares: { $objectToArray: { $ifNull: ['$fallosPorMotivo', {}] } } } },
      { $unwind: '$pares' },
      {
        $group: {
          _id: { zonaId: '$zonaId', motivo: '$pares.k' },
          fallos: { $sum: '$pares.v' },
        },
      },
      { $match: { fallos: { $gt: 0 } } },
      { $sort: { fallos: -1 } },
    ]).toArray(),
    db.collection('metricas_diarias').aggregate([
      { $match: filtro },
      {
        $group: {
          _id: '$_id.hubId',
          entregados: { $sum: '$entregados' },
          aTiempo: { $sum: '$aTiempo' },
        },
      },
      { $sort: { _id: 1 } },
    ]).toArray(),
    db.collection('metricas_tiempos').aggregate([
      {
        $project: {
          hubId: '$_id',
          muestras: 1,
          promedioMinutos: {
            $cond: [{ $gt: ['$muestras', 0] }, { $divide: ['$sumaMinutos', '$muestras'] }, null],
          },
        },
      },
      { $sort: { hubId: 1 } },
    ]).toArray(),
  ]);

  const porcentaje = (parte, total) => (total ? `${((parte / total) * 100).toFixed(1)}%` : '—');
  const totalFallos = porMotivo.reduce((suma, r) => suma + r.fallos, 0);

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analítica</h1>
        <p className="text-sm text-neutral-400">Indicadores de mejora sobre metricas_diarias</p>
      </div>

      <form className="flex flex-wrap items-end gap-2 text-sm" method="get">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">Zona</span>
          <input
            name="zonaId"
            defaultValue={zonaId ?? ''}
            placeholder="Z-CENTRO"
            className="w-32 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">Desde</span>
          <input
            name="desde"
            defaultValue={desde ?? ''}
            placeholder="2026-11-01"
            className="w-36 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">Hasta</span>
          <input
            name="hasta"
            defaultValue={hasta ?? ''}
            placeholder="2026-11-30"
            className="w-36 rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5"
          />
        </label>
        <button type="submit" className="rounded border border-neutral-600 px-3 py-1.5 hover:bg-neutral-800">
          Filtrar
        </button>
      </form>

      <section className="rounded-lg border border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Tasa de entrega en primer intento
          </h2>
          <p className="text-xs text-neutral-500">¿Dónde y cuándo fallamos más?</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Zona</th>
                <th className="px-4 py-2 font-medium">Franja</th>
                <th className="px-4 py-2 text-right font-medium">Entregados</th>
                <th className="px-4 py-2 text-right font-medium">Primer intento</th>
                <th className="px-4 py-2 text-right font-medium">Tasa</th>
              </tr>
            </thead>
            <tbody>
              {porZonaFranja.map((r) => (
                <tr key={`${r._id.zonaId}-${r._id.franja}`} className="border-t border-neutral-800/70">
                  <td className="whitespace-nowrap px-4 py-2">{r._id.zonaId ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-400">{r._id.franja ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.entregados}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.primerIntento}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-400">
                    {porcentaje(r.primerIntento, r.entregados)}
                  </td>
                </tr>
              ))}
              {porZonaFranja.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    Sin datos para el filtro
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800">
        <div className="flex items-baseline justify-between border-b border-neutral-800 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Distribución de motivos de fallo
            </h2>
            <p className="text-xs text-neutral-500">¿Por qué fallamos?</p>
          </div>
          <span className="text-xs text-neutral-500">{totalFallos.toLocaleString('es-AR')} fallos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Zona</th>
                <th className="px-4 py-2 font-medium">Motivo</th>
                <th className="px-4 py-2 text-right font-medium">Fallos</th>
                <th className="px-4 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {porMotivo.map((r) => (
                <tr key={`${r._id.zonaId}-${r._id.motivo}`} className="border-t border-neutral-800/70">
                  <td className="whitespace-nowrap px-4 py-2">{r._id.zonaId ?? '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-neutral-400">
                    {r._id.motivo?.replaceAll('_', ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-rose-400">{r.fallos}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-500">
                    {porcentaje(r.fallos, totalFallos)}
                  </td>
                </tr>
              ))}
              {porMotivo.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    Sin fallos registrados por motivo. Revisá que el servicio de analítica guarde
                    fallosPorMotivo al procesar ENTREGA_FALLIDA.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Cumplimiento de SLA por hub
          </h2>
          <p className="text-xs text-neutral-500">¿Qué hub llega tarde?</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Hub</th>
                <th className="px-4 py-2 text-right font-medium">Entregados</th>
                <th className="px-4 py-2 text-right font-medium">A tiempo</th>
                <th className="px-4 py-2 text-right font-medium">Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {porHub.map((r) => (
                <tr key={r._id ?? 'sin-hub'} className="border-t border-neutral-800/70">
                  <td className="whitespace-nowrap px-4 py-2">{r._id ?? '—'}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.entregados}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.aTiempo}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-400">
                    {porcentaje(r.aTiempo, r.entregados)}
                  </td>
                </tr>
              ))}
              {porHub.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    Sin datos para el filtro
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Tiempo medio hub → reparto
          </h2>
          <p className="text-xs text-neutral-500">Indicador de replay sobre el histórico</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Hub</th>
                <th className="px-4 py-2 text-right font-medium">Muestras</th>
                <th className="px-4 py-2 text-right font-medium">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {porTiempos.map((r) => (
                <tr key={r.hubId} className="border-t border-neutral-800/70">
                  <td className="whitespace-nowrap px-4 py-2">{r.hubId}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.muestras}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-emerald-400">
                    {r.promedioMinutos === null ? '—' : `${r.promedioMinutos.toFixed(1)} min`}
                  </td>
                </tr>
              ))}
              {porTiempos.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-neutral-500">
                    Sin datos de replay todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
