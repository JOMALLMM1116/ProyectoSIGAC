#!/bin/bash
# Lee la bitacora y se la pasa al verificador, que corre dentro del contenedor de n8n
cd "$(dirname "$0")/.."
docker compose exec -T postgres psql -U sigac_app -d sigac -A -F '|' -t -c \
"select id, tabla_afectada, id_registro, hash_anterior, hash_actual from bitacora_auditoria order by id;" \
> /tmp/bitacora.txt
docker compose cp scripts/verificar_cadena.js n8n:/tmp/verificar.js
docker compose cp /tmp/bitacora.txt n8n:/tmp/bitacora.txt
docker compose exec -T n8n sh -c "node /tmp/verificar.js < /tmp/bitacora.txt"
