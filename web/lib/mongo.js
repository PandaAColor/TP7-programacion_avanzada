import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI ?? 'mongodb://mongo:27017/rutasur?replicaSet=rs0';

let cliente;
let promesa;

/**
 * Devuelve el cliente de MongoDB, reutilizándolo entre recargas de Next.
 * @returns {Promise<MongoClient>}
 */
export async function getCliente() {
  if (!promesa) {
    cliente = new MongoClient(uri);
    promesa = cliente.connect();
  }
  return promesa;
}

/**
 * Devuelve la base rutasur.
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
  const c = await getCliente();
  return c.db('rutasur');
}
