// WF-06 Reporte semanal · Nombra el archivo
// modo: runOnceForAllItems
// usa: $(), $input
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-06_reporte.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf06_nombra_el_archivo($input, $, $json, $env, DateTime) {
// gotenberg devuelve el binario sin nombre util, asi que el correo
// lo adjuntaba con un identificador aleatorio. aqui se le pone el
// mismo nombre con que se guarda en disco.
const nombre = $('Compone el reporte').first().json.nombre_archivo;
const item = $input.first();

item.binary.data.fileName = nombre;
item.binary.data.fileExtension = 'pdf';
item.binary.data.mimeType = 'application/pdf';

return [item];
}

wf06_nombra_el_archivo.meta = {"flujo":"WF-06 Reporte semanal","nodo":"Nombra el archivo","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$input"]};

module.exports = wf06_nombra_el_archivo;
