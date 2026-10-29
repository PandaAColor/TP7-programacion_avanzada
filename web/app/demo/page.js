'use client';

import { useState } from 'react';

const ESCENARIOS = [
  { id: 'feliz', etiqueta: 'Envío feliz', detalle: 'Recorre todos los estados sin incidentes' },
  { id: 'ausente', etiqueta: 'Ausente', detalle: 'Falla y se reprograma al día siguiente' },
  { id: 'demorado', etiqueta: 'Demorado', detalle: 'Queda en el hub hasta generar alerta' },
  { id: 'tercer-fallo', etiqueta: 'Tercer fallo', detalle: 'Agota intentos y pasa a devolución' },
  { id: 'rafaga', etiqueta: 'Ráfaga', detalle: '500 envíos en pocos segundos' },
];

/**
 * Botones para disparar los escenarios del simulador.
 */
export default function PanelDemo() {
  const [estado, setEstado] = useState({});

  const disparar = async (escenario) => {
    setEstado((previo) => ({ ...previo, [escenario]: 'disparando…' }));
    try {
      const res = await fetch(`/api/demo/${escenario}`, { method: 'POST' });
      setEstado((previo) => ({
        ...previo,
        [escenario]: res.ok ? 'disparado' : `falló (${res.status})`,
      }));
    } catch {
      setEstado((previo) => ({ ...previo, [escenario]: 'sin conexión' }));
    }
  };

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel de demo</h1>
        <p className="text-sm text-neutral-400">Dispara escenarios del simulador durante la presentación</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ESCENARIOS.map((e) => (
          <div key={e.id} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="text-sm font-medium">{e.etiqueta}</div>
            <p className="mt-1 text-xs text-neutral-500">{e.detalle}</p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => disparar(e.id)}
                className="rounded border border-neutral-600 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                Disparar
              </button>
              {estado[e.id] && <span className="text-xs text-neutral-400">{estado[e.id]}</span>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
