import { MongoClient } from 'mongodb';
import { registrarConexion } from './kafka.js';

let cliente = null;
let db = null;

export async function conectarMongo() {
  if (db) return db;

  const uri = process.env.MONGO_URI || 'mongodb://mongo:27017/rutasur?replicaSet=rs0';
  cliente = new MongoClient(uri);
  await cliente.connect();
  db = cliente.db();
  registrarConexion(cliente);
  return db;
}
