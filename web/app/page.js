import { getDb } from '../lib/mongo.js';
import TorreCliente from './torre-cliente.js';

export const dynamic = 'force-dynamic';

/**
 * Torre de control: contadores, alertas priorizadas y últimos eventos.
 */
export default async function Torre() {
  const db = await getDb();

  const [porEstado, alertas, ultimos, totalEnvios] = await Promise.all([
    db.collection('envios').aggregate([{ $group: { _id: '$estado', total: { $sum: 1 } } }]).toArray(),
    db.collection('alertas').find({ estado: 'ABIERTA' }).sort({ prioridad: 1, actualizadoEn: -1 }).limit(20).toArray(),
    db.collection('envios').find({}).sort({ actualizadoEn: -1 }).limit(15).toArray(),
    db.collection('envios').countDocuments(),
  ]);

  const contadores = Object.fromEntries(porEstado.map((e) => [e._id ?? 'SIN_ESTADO', e.total]));

  return (
    <main className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Torre de control</h1>
          <p className="text-sm text-neutral-400">
            {totalEnvios.toLocaleString('es-AR')} envíos registrados · actualización en vivo
          </p>
        </div>
        <span className="flex items-center gap-2 text-xs text-neutral-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          en vivo
        </span>
      </div>

      <TorreCliente
        contadoresIniciales={contadores}
        alertasIniciales={alertas.map((a) => ({ ...a, _id: String(a._id) }))}
        ultimosIniciales={ultimos.map((e) => ({
          shipmentId: e.shipmentId,
          estado: e.estado,
          zonaId: e.zonaId,
          actualizadoEn: e.actualizadoEn?.toISOString() ?? null,
        }))}
      />
    </main>
  );
}
