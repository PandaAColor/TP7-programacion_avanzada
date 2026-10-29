import { TOPICS } from '@rutasur/shared';
import { crearEnvio, sobre, promesa, resultadoIntento } from './envios.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export class Simulador {
  constructor({ producer, reloj, aleatorio, config, logger }) {
    this.producer = producer;
    this.reloj = reloj;
    this.aleatorio = aleatorio;
    this.config = config;
    this.log = logger;
    this.contador = 0;
    this.activo = false;
  }

  async publicar(topic, evento) {
    await this.producer.send({
      topic,
      messages: [{ key: evento.shipmentId, value: JSON.stringify(evento) }],
    });
  }

  /** Publica aplicando los defectos configurados. */
  async publicarConDefectos(topic, evento) {
    if (this.aleatorio.probabilidad(this.config.probabilidadMalformado)) {
      const malformado = { shipmentId: evento.shipmentId, tipo: evento.tipo };
      await this.publicar(topic, malformado);
      this.log.warn('evento malformado inyectado', { shipmentId: evento.shipmentId });
      return;
    }

    if (this.aleatorio.probabilidad(this.config.probabilidadDuplicado)) {
      await this.publicar(topic, evento);
      this.log.info('duplicado inyectado', { eventId: evento.eventId });
    }

    await this.publicar(topic, evento);

    if (this.aleatorio.probabilidad(this.config.probabilidadFueraDeOrden) && evento.secuencia > 1) {
      const atrasado = { ...evento, eventId: crypto.randomUUID(), secuencia: evento.secuencia - 1 };
      await this.publicar(topic, atrasado);
      this.log.info('fuera de orden inyectado', { shipmentId: evento.shipmentId });
    }
  }

  async cicloEnvio(envio, opciones = {}) {
    const { forzarDemora = envio.demorado, forzarTercerFallo = false } = opciones;

    await this.publicar(TOPICS.PROMESAS, promesa(envio, this.reloj));
    await esperar(this.reloj.msReales(0.2));

    await this.publicarConDefectos(TOPICS.ESTADOS, sobre(envio, 'CREADO', this.reloj));
    await esperar(this.reloj.msReales(2));

    await this.publicarConDefectos(TOPICS.ESTADOS, sobre(envio, 'INGRESADO_HUB', this.reloj));

    if (forzarDemora) {
      this.log.info('envio demorado en hub', { shipmentId: envio.shipmentId });
      await esperar(this.reloj.msReales(600));
    } else {
      await esperar(this.reloj.msReales(3));
    }

    await this.publicarConDefectos(TOPICS.ESTADOS, sobre(envio, 'CLASIFICADO', this.reloj));
    await esperar(this.reloj.msReales(2));
    await this.publicarConDefectos(TOPICS.ESTADOS, sobre(envio, 'EN_REPARTO', this.reloj));
    await esperar(this.reloj.msReales(4));

    const intentos = forzarTercerFallo ? 3 : 1;
    for (let i = 0; i < intentos; i += 1) {
      envio.intentos += 1;
      const resultado = forzarTercerFallo
        ? { tipo: 'ENTREGA_FALLIDA', motivo: 'AUSENTE' }
        : resultadoIntento(envio, this.aleatorio, this.config);

      await this.publicarConDefectos(
        TOPICS.ESTADOS,
        sobre(envio, resultado.tipo, this.reloj, resultado.motivo ? { motivo: resultado.motivo } : {}),
      );

      if (resultado.tipo === 'ENTREGADO') return;

      if (resultado.motivo === 'AUSENTE' && envio.intentos < 3) {
        await esperar(this.reloj.msReales(5));
        await this.publicarConDefectos(TOPICS.ESTADOS, sobre(envio, 'EN_REPARTO', this.reloj));
        await esperar(this.reloj.msReales(4));
      } else {
        return;
      }
    }
  }

  async flujoContinuo() {
    this.activo = true;

    if (!(this.config.enviosPorMinuto > 0)) {
      this.log.info('generador continuo deshabilitado', {
        enviosPorMinuto: this.config.enviosPorMinuto,
      });
      return;
    }

    const intervaloReal = (60 * 1000) / this.config.enviosPorMinuto;

    while (this.activo) {
      this.contador += 1;
      const envio = crearEnvio({
        aleatorio: this.aleatorio,
        config: this.config,
        reloj: this.reloj,
        indice: this.contador,
      });
      this.cicloEnvio(envio).catch((err) =>
        this.log.error('fallo ciclo envio', { error: err.message }),
      );
      await esperar(intervaloReal);
    }
  }

  nuevoEnvio() {
    this.contador += 1;
    return crearEnvio({
      aleatorio: this.aleatorio,
      config: this.config,
      reloj: this.reloj,
      indice: this.contador,
    });
  }

  async escenario(nombre) {
    this.log.info('escenario disparado', { nombre });

    switch (nombre) {
      case 'feliz': {
        const envio = this.nuevoEnvio();
        envio.tasaFallo = 0;
        envio.demorado = false;
        await this.cicloEnvio(envio, { forzarDemora: false });
        return { ok: true, shipmentId: envio.shipmentId };
      }
      case 'ausente': {
        const envio = this.nuevoEnvio();
        envio.tasaFallo = 1;
        await this.cicloEnvio(envio, { forzarDemora: false });
        return { ok: true, shipmentId: envio.shipmentId };
      }

      case 'demorado': {
        const envio = this.nuevoEnvio();
        envio.demorado = true;
        this.cicloEnvio(envio, { forzarDemora: true }).catch((err) =>
          this.log.error('fallo escenario demorado', { error: err.message }),
        );
        return { ok: true, shipmentId: envio.shipmentId };
      }

      case 'tercer-fallo': {
        const envio = this.nuevoEnvio();
        this.cicloEnvio(envio, { forzarTercerFallo: true }).catch((err) =>
          this.log.error('fallo escenario tercer-fallo', { error: err.message }),
        );
        return { ok: true, shipmentId: envio.shipmentId };
      }

      case 'rafaga': {
        const total = 500;
        const envios = [];
        for (let i = 0; i < total; i += 1) {
          const envio = this.nuevoEnvio();
          envios.push(envio.shipmentId);
          this.cicloEnvio(envio).catch((err) =>
            this.log.error('fallo rafaga', { error: err.message }),
          );
          await esperar(this.reloj.msReales(0.05));
        }
        return { ok: true, cantidad: total, primeros: envios.slice(0, 5) };
      }

      default:
        return { ok: false, error: `escenario desconocido: ${nombre}` };
    }
  }

  detener() {
    this.activo = false;
  }
}
