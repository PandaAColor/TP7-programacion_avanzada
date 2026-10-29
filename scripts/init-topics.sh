#!/usr/bin/env bash
set -euo pipefail

BROKER="kafka:9092"
KT="/opt/kafka/bin/kafka-topics.sh"

crear() {
  local topic="$1" particiones="$2" retencion_ms="$3" compactado="${4:-false}"

  if "$KT" --bootstrap-server "$BROKER" --list | grep -qx "$topic"; then
    echo "ya existe: $topic"
    return
  fi

  if [ "$compactado" = "true" ]; then
    "$KT" --bootstrap-server "$BROKER" \
      --create --topic "$topic" \
      --partitions "$particiones" \
      --replication-factor 1 \
      --config "cleanup.policy=compact"
  else
    "$KT" --bootstrap-server "$BROKER" \
      --create --topic "$topic" \
      --partitions "$particiones" \
      --replication-factor 1 \
      --config "cleanup.policy=delete" \
      --config "retention.ms=${retencion_ms}"
  fi

  echo "creado: $topic"
}

DIA_MS=$((24 * 60 * 60 * 1000))

crear "envios.estados"            3 $((30 * DIA_MS)) false
crear "envios.promesas"           3 0                 true
crear "envios.reprogramaciones"   3 $((30 * DIA_MS)) false
crear "alertas.sla"               3 $((7  * DIA_MS)) false
crear "notificaciones.enviadas"   3 $((7  * DIA_MS)) false
crear "envios.estados.dlq"        1 $((30 * DIA_MS)) false

echo "--- topics ---"
"$KT" --bootstrap-server "$BROKER" --list

