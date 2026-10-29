import seedrandom from 'seedrandom';

export class Aleatorio {
  constructor(seed) {
    this.rng = seedrandom(seed);
  }

  numero() {
    return this.rng();
  }

  entero(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  elegir(lista) {
    return lista[this.entero(0, lista.length - 1)];
  }

  probabilidad(p) {
    return this.rng() < p;
  }

  /** Elige un motivo según la distribución ponderada. */
  motivo(distribucion) {
    const r = this.rng();
    let acumulado = 0;
    for (const item of distribucion) {
      acumulado += item.peso;
      if (r <= acumulado) return item.motivo;
    }
    return distribucion[distribucion.length - 1].motivo;
  }
}
