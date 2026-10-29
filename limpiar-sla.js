const ids = db.envios.distinct("shipmentId");
const r = db.sla_estado.deleteMany({cerrado:false, shipmentId:{$nin:ids}});
print(r.deletedCount);
