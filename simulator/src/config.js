export const config = {
  seed: process.env.SIM_SEED || '42',
  enviosPorMinuto: Number(process.env.SIM_SHIPMENTS_PER_MINUTE || 20),
  aceleracion: Number(process.env.SIM_ACCELERATION || 120),
  apiPort: Number(process.env.SIM_API_PORT || 4000),
  probabilidadDemoraHub: 0.10,
  probabilidadDuplicado: 0.02,
  probabilidadFueraDeOrden: 0.02,
  probabilidadMalformado: 0.01,
  tasaFalloPorZona: {
    'Z-NORTE': 0.30,
    'Z-CENTRO': 0.18,
    'Z-SUR': 0.05,
  },
  distribucionMotivos: [
    { motivo: 'AUSENTE', peso: 0.60 },
    { motivo: 'DIRECCION_INCORRECTA', peso: 0.20 },
    { motivo: 'RECHAZADO', peso: 0.15 },
    { motivo: 'ZONA_INACCESIBLE', peso: 0.05 },
  ],
  hubs: ['HUB-1', 'HUB-2', 'HUB-3'],
  zonas: ['Z-NORTE', 'Z-CENTRO', 'Z-SUR'],
  franjas: ['MANANA', 'TARDE'],
};
