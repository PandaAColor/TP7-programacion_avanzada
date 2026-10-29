import { NextResponse } from 'next/server';

const SIMULADOR = process.env.SIMULADOR_URL ?? 'http://simulator:4000';

/**
 * Reenvía el disparo de un escenario al simulador.
 * @param {{params: Promise<{escenario: string}>}} props
 */
export async function POST(_request, { params }) {
  const { escenario } = await params;
  try {
    const res = await fetch(`${SIMULADOR}/escenarios/${escenario}`, { method: 'POST' });
    const cuerpo = await res.text();
    return NextResponse.json(
      { ok: res.ok, escenario, detalle: cuerpo.slice(0, 300) },
      { status: res.status },
    );
  } catch (error) {
    return NextResponse.json(
      { ok: false, escenario, error: String(error?.message ?? error) },
      { status: 502 },
    );
  }
}
