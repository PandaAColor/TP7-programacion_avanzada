'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Formulario de acceso al tracking público por id de envío.
 * @returns {JSX.Element} Página con el buscador de envíos.
 */
export default function BuscarTracking() {
  const router = useRouter();
  const [shipmentId, setShipmentId] = useState('');

  const ir = (evento) => {
    evento.preventDefault();
    const id = shipmentId.trim();
    if (!id) return;
    router.push(`/tracking/${encodeURIComponent(id)}`);
  };

  return (
    <main className="mx-auto max-w-md space-y-6 py-16">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguimiento de envío</h1>
        <p className="text-sm text-neutral-400">Ingresá el id del envío para ver su estado.</p>
      </div>

      <form onSubmit={ir} className="flex flex-col gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-wide text-neutral-500">Id del envío</span>
          <input
            value={shipmentId}
            onChange={(e) => setShipmentId(e.target.value)}
            placeholder="S-007126-672752"
            autoFocus
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={!shipmentId.trim()}
          className="rounded border border-neutral-600 px-3 py-2 hover:bg-neutral-800 disabled:opacity-40"
        >
          Ver seguimiento
        </button>
      </form>
    </main>
  );
}
