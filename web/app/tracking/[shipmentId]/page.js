import { notFound } from 'next/navigation';
import { getDb } from '../../../lib/mongo.js';
import { formatearFecha } from '../../../lib/fechas.js';

export const dynamic = 'force-dynamic';

const PASOS = ['CREADO', 'INGRESADO_HUB', 'CLASIFICADO', 'EN_REPARTO', 'ENTREGADO'];

/**
 * Tracking público: solo estado actual y fecha estimada.
 * @param {{params: Promise<{shipmentId: string}>}} props
 */
export default async function TrackingPublico({ params }) {
  const { shipmentId } = await params;
  const db = await getDb();
  const envio = await db
    .collection('envios')
    .findOne({ shipmentId }, { projection: { estado: 1, promesa: 1, shipmentId: 1 } });

  if (!envio) notFound();

  const actual = PASOS.indexOf(envio.estado);
  const fallido = envio.estado === 'ENTREGA_FALLIDA';

  return (
    <main className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguimiento de tu envío</h1>
        <p className="font-mono text-sm text-neutral-500">{envio.shipmentId}</p>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
        <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Estado actual
        </div>
        <div className={`mt-1 text-xl font-semibold ${fallido ? 'text-rose-400' : 'text-emerald-400'}`}>
          {envio.estado?.replaceAll('_', ' ') ?? '—'}
        </div>
        <div className="mt-4 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
          Entrega estimada
        </div>
        <div className="mt-1 text-lg tabular-nums text-neutral-200">
          {formatearFecha(envio.promesa?.venceEn)}
        </div>
      </div>

      <ol className="space-y-3">
        {PASOS.map((paso, indice) => {
          const alcanzado = !fallido && indice <= actual;
          return (
            <li key={paso} className="flex items-center gap-3 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  alcanzado ? 'bg-emerald-500' : 'bg-neutral-700'
                }`}
              />
              <span className={alcanzado ? 'text-neutral-200' : 'text-neutral-500'}>
                {paso.replaceAll('_', ' ')}
              </span>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
