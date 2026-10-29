/**
 * Reloj simulado. Avanza aceleracion veces más rápido que el real.
 */
export class RelojSimulado {
  constructor(aceleracion, inicio = new Date()) {
    this.aceleracion = aceleracion;
    this.inicioReal = Date.now();
    this.inicioSimulado = inicio.getTime();
  }

  ahora() {
    const transcurridoReal = Date.now() - this.inicioReal;
    return new Date(this.inicioSimulado + transcurridoReal * this.aceleracion);
  }

  /** Convierte minutos simulados a milisegundos reales de espera. */
  msReales(minutosSimulados) {
    return (minutosSimulados * 60 * 1000) / this.aceleracion;
  }

  iso() {
    return this.ahora().toISOString();
  }
}
