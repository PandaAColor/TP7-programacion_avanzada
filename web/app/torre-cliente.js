'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatearFecha } from '../lib/fechas.js';

const ORDEN_ESTADOS = [
  'CREADO',
  'INGRESADO_HUB',
  'CLASIFICADO',
  'EN_REPARTO',
  'ENTREGADO',
  'ENTREGA_FALLIDA',
];

const COLOR_ESTADO = {
  CREADO: 'text-neutral-300',
  INGRESADO_HUB: 'text-sky-400',
  CLASIFICADO: 'text-sky-400',
  EN_REPARTO: 'text-amber-400',
  ENTREGADO: 'text-emerald-400',
  ENTREGA_FALLIDA: 'text-rose-400',
};

const COLOR_PRIORIDAD = {
  CRITICA: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  ALTA: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  MEDIA: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  BAJA: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
};

/**
 * Aplica en vivo el snapshot que llega por SSE.
 * @param {{contadoresIniciales: object, alertasIniciales: object[], ultimosIniciales: object[]}} props
 */
export default function TorreCliente({ contadoresIniciales, alertasIniciales, ultimosIniciales }) {
  const [contadores, setContadores] = useState(contadoresIniciales ?? {});
  const [alertas, setAlertas] = useState(alertasIniciales ?? []);
  const [ultimos, setUltimos] = useState(ultimosIniciales ?? []);

  useEffect(() => {
    const fuente = new EventSource('/api/stream');

    fuente.onmessage = (evento) => {
      let datos;
      try {
        datos = JSON.parse(evento.data);
      } catch {
        return;
      }
      if (datos.tipo !== 'snapshot') return;

      if (datos.contadores) setContadores(datos.contadores);
      if (Array.isArray(datos.alertas)) setAlertas(datos.alertas);
      if (Array.isArray(datos.ultimos)) setUltimos(datos.ultimos);
    };

    fuente.onerror = () => {
      /* EventSource reintenta solo */
    };

    return () => fuente.close();
  }, []);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ORDEN_ESTADOS.map((estado) => (
          <div
            key={estado}
            className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              {estado.replaceAll('_', ' ')}
            </div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${COLOR_ESTADO[estado]}`}>
              {(contadores[estado] ?? 0).toLocaleString('es-AR')}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-neutral-800">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Alertas abiertas
          </h2>
          <span className="text-xs text-neutral-500">{alertas.length} en cola</span>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2 font-medium">Prioridad</th>
              <th className="px-4 py-2 font-medium">Regla</th>
              <th className="px-4 py-2 font-medium">Envío</th>
              <th className="px-4 py-2 font-medium">Vence</th>
            </tr>
          </thead>
          <tbody>
            {alertas.map((a) => (
              <tr key={a.alertaId} className="border-t border-neutral-800/70 hover:bg-neutral-900/60">
                <td className="px-4 py-2">
                  <span
                    className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
                      COLOR_PRIORIDAD[a.prioridad] ?? COLOR_PRIORIDAD.BAJA
                    }`}
                  >
                    {a.prioridad}
                  </span>
                </td>
                <td className="px-4 py-2 text-neutral-300">{a.regla?.replaceAll('_', ' ')}</td>
                <td className="px-4 py-2">
                  <Link className="font-mono text-xs text-sky-400 hover:underline" href={`/envios/${a.shipmentId}`}>
                    {a.shipmentId}
                  </Link>
                </td>
                <td className="px-4 py-2 tabular-nums text-neutral-400">{formatearFecha(a.venceEn)}</td>
              </tr>
            ))}
            {alertas.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                  Sin alertas abiertas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-neutral-800">
        <div className="border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Últimos eventos
          </h2>
        </div>
        <ul className="divide-y divide-neutral-800/70 text-sm">
          {ultimos.map((e) => (
            <li key={e.shipmentId} className="flex items-center gap-4 px-4 py-2 hover:bg-neutral-900/60">
              <span className="w-20 shrink-0 tabular-nums text-xs text-neutral-500">
                {formatearFecha(e.actualizadoEn, 'hora')}
              </span>
              <Link className="font-mono text-xs text-sky-400 hover:underline" href={`/envios/${e.shipmentId}`}>
                {e.shipmentId}
              </Link>
              <span className={`text-xs font-medium ${COLOR_ESTADO[e.estado] ?? 'text-neutral-300'}`}>
                {e.estado?.replaceAll('_', ' ') ?? '—'}
              </span>
              <span className="ml-auto text-xs text-neutral-500">{e.zonaId}</span>
            </li>
          ))}
          {ultimos.length === 0 && (
            <li className="px-4 py-6 text-center text-neutral-500">Sin eventos todavía</li>
          )}
        </ul>
      </section>
    </div>
  );
}
