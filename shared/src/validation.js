import { esquemasPorTopic } from './schemas.js';

/**
 * Valida un evento crudo contra el esquema del topic.
 * @param {string} topic
 * @param {unknown} crudo
 * @returns {{ok: true, evento: object} | {ok: false, motivo: string}}
 */
export function validarEvento(topic, crudo) {
  const esquema = esquemasPorTopic[topic];
  if (!esquema) {
    return { ok: false, motivo: `topic sin esquema: ${topic}` };
  }

  const resultado = esquema.safeParse(crudo);
  if (!resultado.success) {
    const motivo = resultado.error.issues
      .map((i) => `${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('; ');
    return { ok: false, motivo };
  }

  return { ok: true, evento: resultado.data };
}

/**
 * Parsea el value de Kafka a objeto. Devuelve null si no es JSON.
 * @param {Buffer|null} buffer
 */
export function parsearMensaje(buffer) {
  if (!buffer) return null;
  try {
    return JSON.parse(buffer.toString('utf8'));
  } catch {
    return null;
  }
}
