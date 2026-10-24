// extraer_nodos.js
//
// genera la carpeta nodos/ a partir de los flujos exportados en
// ../workflows: un archivo por cada nodo Code, con su codigo
// exactamente como esta en n8n. las pruebas verifican lo que se
// publico, no una copia que pueda quedar desfasada.
//
// cada archivo exporta una funcion. las variables que n8n inyecta
// en un nodo Code llegan como parametros: $input, $ (para
// $('Nodo')), $json, $env y DateTime. this.helpers se pasa con
// .call(contexto, ...) desde la prueba.
//
// si el codigo usa await, la funcion se declara async: en n8n el
// nodo Code ya corre dentro de una funcion asincrona.
//
// antes de escribir se borran los archivos .js que hubiera en
// nodos/, para que un nodo eliminado en n8n no deje un archivo viejo.
//
// uso: npm run extraer

'use strict';

const fs = require('fs');
const path = require('path');

const CARPETA = path.join(__dirname, '..', 'workflows');
const DESTINO = path.join(__dirname, 'nodos');

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

// prepara la carpeta destino sin archivos viejos
fs.mkdirSync(DESTINO, { recursive: true });
for (const viejo of fs.readdirSync(DESTINO)) {
  if (viejo.endsWith('.js')) fs.unlinkSync(path.join(DESTINO, viejo));
}

const archivos = fs.readdirSync(CARPETA)
  .filter(f => /^WF-\d+_.*\.json$/i.test(f))
  .sort();

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

    const contenido =
      '// ' + flujo.name + ' · ' + nodo.name + '\n' +
      '// modo: ' + modo + (asincrona ? ' · asincrona' : '') + '\n' +
      '// usa: ' + (variables.join(', ') || 'nada de n8n') + '\n' +
      '//\n' +
      '// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/' + archivo + '\n' +
      '// no editar a mano: los cambios se hacen en n8n, se exporta el\n' +
      '// flujo y se vuelve a ejecutar npm run extraer.\n\n' +
      "'use strict';\n\n" +
      (asincrona ? 'async ' : '') +
      'function ' + nombre + '($input, $, $json, $env, DateTime) {\n' +
      codigo + '\n' +
      '}\n\n' +
      nombre + '.meta = ' + JSON.stringify({
        flujo: flujo.name, nodo: nodo.name, modo: modo,
        asincrona: asincrona, variables: variables
      }) + ';\n\n' +
      'module.exports = ' + nombre + ';\n';

    fs.writeFileSync(path.join(DESTINO, nombre + '.js'), contenido);
    resumen.push({ archivo: 'nodos/' + nombre + '.js', modo: modo, async: asincrona ? 'si' : '' });
  }
}

console.table(resumen);
console.log('\n' + resumen.length + ' archivos escritos en nodos/');
