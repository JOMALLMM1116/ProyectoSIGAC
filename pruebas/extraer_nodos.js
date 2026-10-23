// extraer_nodos.js
//
// genera nodos_sigac.js a partir de los flujos exportados en
// ../workflows. cada nodo Code se convierte en una funcion que
// contiene su codigo exactamente como esta en n8n: las pruebas
// verifican lo que se publico, no una copia que pueda quedar
// desfasada.
//
// las variables que n8n inyecta en un nodo Code llegan como
// parametros: $input, $ (para $('Nodo')), $json, $env y DateTime.
// this.helpers se pasa con .call(contexto, ...) desde la prueba.
//
// si el codigo usa await, la funcion se declara async: en n8n el
// nodo Code ya corre dentro de una funcion asincrona.
//
// uso: node extraer_nodos.js

'use strict';

const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, '..', 'workflows');
const SALIDA = path.join(__dirname, 'nodos_sigac.js');

// "WF-01_ingesta.json" -> "wf01"
function prefijo(archivo) {
  const m = /^WF-(\d+)/i.exec(archivo);
  return m ? 'wf' + m[1] : 'wf';
}

// "¿Datos válidos?" -> "datos_validos"
function slug(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// variables de n8n que usa el codigo, para saber que simular
function variablesUsadas(codigo) {
  const usadas = new Set();
  const patron = /\$\(|\$[A-Za-z_]+/g;
  let m;
  while ((m = patron.exec(codigo)) !== null) {
    usadas.add(m[0] === '$(' ? '$()' : m[0]);
  }
  if (/\bDateTime\b/.test(codigo)) usadas.add('DateTime');
  if (/\bthis\.helpers\b/.test(codigo)) usadas.add('this.helpers');
  return [...usadas].sort();
}

const archivos = fs.readdirSync(CARPETA)
  .filter(f => /^WF-\d+_.*\.json$/i.test(f))
  .sort();

const partes = [];
const resumen = [];
const nombresUsados = new Set();

for (const archivo of archivos) {
  const flujo = JSON.parse(fs.readFileSync(path.join(CARPETA, archivo), 'utf8'));
  const pre = prefijo(archivo);

  for (const nodo of flujo.nodes || []) {
    if (nodo.type !== 'n8n-nodes-base.code') continue;
    const codigo = nodo.parameters && nodo.parameters.jsCode;
    if (!codigo) continue;

    const nombre = pre + '_' + slug(nodo.name);
    if (nombresUsados.has(nombre)) {
      throw new Error('Nombre de funcion repetido: ' + nombre + ' (' + archivo + ')');
    }
    nombresUsados.add(nombre);

    const modo = nodo.parameters.mode === 'runOnceForEachItem'
      ? 'runOnceForEachItem'
      : 'runOnceForAllItems';
    const asincrona = /\bawait\b/.test(codigo);
    const variables = variablesUsadas(codigo);

    partes.push(
      '// ' + '-'.repeat(60) + '\n' +
      '// ' + flujo.name + ' · ' + nodo.name + '\n' +
      '// modo: ' + modo + (asincrona ? ' · asincrona' : '') + '\n' +
      '// usa: ' + (variables.join(', ') || 'nada de n8n') + '\n' +
      'nodos.' + nombre + ' = ' + (asincrona ? 'async ' : '') +
      'function ($input, $, $json, $env, DateTime) {\n' +
      codigo + '\n' +
      '};\n' +
      'nodos.' + nombre + '.meta = ' + JSON.stringify({
        flujo: flujo.name, nodo: nodo.name, modo: modo,
        asincrona: asincrona, variables: variables
      }) + ';\n'
    );

    resumen.push({ funcion: nombre, modo: modo, async: asincrona ? 'si' : '' });
  }
}

const encabezado =
  '// ARCHIVO GENERADO por extraer_nodos.js a partir de ../workflows\n' +
  '// no editar a mano: los cambios se hacen en n8n, se exporta el\n' +
  '// flujo y se vuelve a ejecutar node extraer_nodos.js.\n' +
  '// generado: ' + new Date().toISOString() + '\n\n' +
  "'use strict';\n\n" +
  'const nodos = {};\n\n';

fs.writeFileSync(SALIDA, encabezado + partes.join('\n') + '\nmodule.exports = nodos;\n');

console.table(resumen);
console.log('\n' + resumen.length + ' nodos Code escritos en ' + path.basename(SALIDA));
