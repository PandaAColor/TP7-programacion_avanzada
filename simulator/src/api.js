import http from 'node:http';

const ESCENARIOS = ['feliz', 'ausente', 'demorado', 'tercer-fallo', 'rafaga'];

function json(res, codigo, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(texto),
  });
  res.end(texto);
}

export function crearApi({ simulador, logger, puerto }) {
  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${puerto}`);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    if (req.method === 'GET' && url.pathname === '/health') {
      json(res, 200, { ok: true, servicio: 'simulator' });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/escenarios') {
      json(res, 200, { escenarios: ESCENARIOS });
      return;
    }

    if (req.method === 'POST' && url.pathname.startsWith('/escenarios/')) {
      const nombre = url.pathname.replace('/escenarios/', '');
      if (!ESCENARIOS.includes(nombre)) {
        json(res, 404, { ok: false, error: `escenario desconocido: ${nombre}` });
        return;
      }
      try {
        const resultado = await simulador.escenario(nombre);
        json(res, 200, resultado);
      } catch (err) {
        logger.error('error escenario', { nombre, error: err.message });
        json(res, 500, { ok: false, error: err.message });
      }
      return;
    }

    json(res, 404, { ok: false, error: 'ruta no encontrada' });
  });

  servidor.listen(puerto, () => {
    logger.info('api de escenarios escuchando', { puerto });
  });

  return servidor;
}
