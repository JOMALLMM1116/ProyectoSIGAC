// WF-08 Consulta de historial clinico · Descifra
// modo: runOnceForAllItems
// usa: $(), $env, $input, DateTime
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-08_historial_clinico.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf08_descifra($input, $, $json, $env, DateTime) {
// descifra el historial clinico del paciente. es la funcion inversa
// de la que cifra en WF-01 y WF-07: recibe iv:textoCifrado:etiqueta
// y devuelve el texto original.
//
// AES-GCM verifica ademas la etiqueta de autenticacion: si alguien
// altero el valor cifrado directamente en la base, final() lanza un
// error y WF-00 lo registra. el cifrado tambien protege la integridad.
//
// junta todas las filas en un solo elemento, para que la bitacora
// registre una sola consulta y no una por cada nota leida.
const crypto = require('crypto');

const clave = Buffer.from($env.SIGAC_CLAVE_CIFRADO, 'hex');
if (clave.length !== 32) {
  throw new Error('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes (64 caracteres hex)');
}

function descifrar(valor) {
  if (!valor) return null;
  const partes = String(valor).split(':');
  if (partes.length !== 3) {
    throw new Error('formato de cifrado no reconocido');
  }
  const [ivHex, datosHex, etiquetaHex] = partes;
  const descifrador = crypto.createDecipheriv('aes-256-gcm', clave, Buffer.from(ivHex, 'hex'));
  descifrador.setAuthTag(Buffer.from(etiquetaHex, 'hex'));
  return Buffer.concat([
    descifrador.update(Buffer.from(datosHex, 'hex')),
    descifrador.final()
  ]).toString('utf8');
}

// con Always Output Data, un paciente sin notas llega como un
// elemento vacio. se filtra para devolver una lista vacia.
const filas = $input.all().map(i => i.json).filter(f => f.id);

const notas = filas
  .map(f => ({
    id_nota: f.id,
    fecha: DateTime.fromJSDate(new Date(f.creado_en))
                   .setZone('America/Guatemala')
                   .toFormat("dd/MM/yyyy HH:mm"),
    medico: f.medico,
    especialidad: f.especialidad,
    diagnostico: descifrar(f.diagnostico_cifrado),
    indicaciones: descifrar(f.indicaciones_cifrado)
  }))
  // la consulta trae las mas recientes primero; se invierten para
  // leerlas en orden cronologico, como una historia
  .reverse();

const cita = $('Busca la cita').first().json;
const medico = $('Valida datos').first().json;

return [{
  json: {
    id_paciente: cita.id_paciente,
    id_cita: cita.id_cita,
    id_medico: medico.id_medico,
    total: notas.length,
    notas
  }
}];
}

wf08_descifra.meta = {"flujo":"WF-08 Consulta de historial clinico","nodo":"Descifra","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$env","$input","DateTime"]};

module.exports = wf08_descifra;
