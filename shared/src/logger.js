function emitir(nivel, servicio, mensaje, campos = {}) {
  const linea = {
    ts: new Date().toISOString(),
    nivel,
    servicio,
    mensaje,
    ...campos,
  };
  const texto = JSON.stringify(linea);
  if (nivel === 'error') console.error(texto);
  else console.log(texto);
}

export function crearLogger(servicio) {
  return {
    info: (mensaje, campos) => emitir('info', servicio, mensaje, campos),
    warn: (mensaje, campos) => emitir('warn', servicio, mensaje, campos),
    error: (mensaje, campos) => emitir('error', servicio, mensaje, campos),
  };
}
