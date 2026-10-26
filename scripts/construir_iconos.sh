#!/usr/bin/env bash
# construir_iconos.sh — SIGAC
# Descarga los íconos de Material Symbols (Google, licencia Apache 2.0)
# desde el repositorio oficial y los junta en un solo archivo, web/img/iconos.svg.
# Los íconos se sirven desde la propia web: la política de seguridad de Nginx
# no se abre a servidores externos y el navegador no avisa a nadie al cargarlos.
#
# Para agregar un ícono: sumar su nombre a ICONOS y volver a ejecutar.
# Los nombres son los de https://fonts.google.com/icons

set -euo pipefail

BASE="https://raw.githubusercontent.com/google/material-design-icons/master"
ICONOS="calendar_month stethoscope clinical_notes history event_available person_off event_busy logout light_mode contrast dark_mode search person_add group badge hourglass_top add_circle today refresh key content_copy check_circle warning lock verified_user schedule monitor_heart medical_services person block delete_forever replay visibility close edit_note login health_and_safety"

mkdir -p web/img
SALIDA="web/img/iconos.svg"

{
  echo '<svg xmlns="http://www.w3.org/2000/svg">'
  for nombre in $ICONOS; do
    svg=$(curl -fsS "$BASE/symbols/web/$nombre/materialsymbolsoutlined/${nombre}_24px.svg")
    caminos=$(printf '%s' "$svg" | grep -o '<path[^>]*/>')
    echo "  <symbol id=\"i-$nombre\" viewBox=\"0 -960 960 960\">$caminos</symbol>"
  done
  echo '</svg>'
} > "$SALIDA"

curl -fsS -o web/img/iconos-LICENSE.txt "$BASE/LICENSE"

echo "Íconos: $(grep -c '<symbol' "$SALIDA") en $SALIDA ($(wc -c < "$SALIDA") bytes)"
echo "Licencia: web/img/iconos-LICENSE.txt"
