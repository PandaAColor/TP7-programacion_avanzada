import { validarEvento } from '../shared/src/validation.js';

const ok = validarEvento('envios.estados', {
  eventId: crypto.randomUUID(),
  shipmentId: 'S1',
  tipo: 'CREADO',
  ocurridoEn: new Date().toISOString(),
  secuencia: 1,
  version: 1,
});

console.log('valido:', ok.ok);

const malo = validarEvento('envios.estados', { shipmentId: 'S1' });
console.log('invalido:', malo.ok, '|', malo.motivo);
