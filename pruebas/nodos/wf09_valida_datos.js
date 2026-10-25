// WF-09 Administracion de personas · Valida datos
// modo: runOnceForAllItems
// usa: $()
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-09_administracion.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf09_valida_datos($input, $, $json, $env, DateTime) {
// valida la peticion de administracion antes de tocar la base.
// el cuerpo trae siempre accion y entidad; el resto de campos
// depende de la combinacion.
//
//   agregar     medico, recepcionista       nombre (+ especialidad y colegiado si es medico)
//   desactivar  paciente, medico, recepcionista   id
//   dar_baja    paciente, medico, recepcionista   id
//   reactivar   paciente, medico, recepcionista   id
//
// el paciente no se agrega aqui: nace en WF-01 con su primera
// solicitud, que es donde se valida y cifra su DPI.
const datos = $('Hash del token').first().json.datos || {};
const errores = [];

const acciones  = ['agregar', 'desactivar', 'dar_baja', 'reactivar'];
const entidades = ['paciente', 'medico', 'recepcionista'];

const accion  = String(datos.accion  || '').trim().toLowerCase();
const entidad = String(datos.entidad || '').trim().toLowerCase();

if (!acciones.includes(accion)) {
  errores.push('La accion debe ser agregar, desactivar, dar_baja o reactivar');
}
if (!entidades.includes(entidad)) {
  errores.push('La entidad debe ser paciente, medico o recepcionista');
}

// ---- agregar ----
let nombre = null;
let especialidad = null;
let colegiado = null;

if (accion === 'agregar') {
  if (entidad === 'paciente') {
    errores.push('Los pacientes se registran con su primera solicitud de cita, no desde administracion');
  }

  if (entidad === 'medico' || entidad === 'recepcionista') {
    nombre = String(datos.nombre || '').trim() || null;
    if (!nombre) {
      errores.push('Falta el campo nombre');
    } else if (nombre.length > 120) {
      errores.push('El nombre no puede exceder 120 caracteres');
    }
  }

  if (entidad === 'medico') {
    especialidad = String(datos.especialidad || '').trim() || null;
    if (!especialidad) {
      errores.push('Falta el campo especialidad');
    } else if (especialidad.length > 60) {
      errores.push('La especialidad no puede exceder 60 caracteres');
    }

    // el colegiado es unico en la tabla medico. aqui solo se valida
    // la forma; si ya existe, lo detecta el insert y responde 409.
    colegiado = String(datos.colegiado || '').trim() || null;
    if (!colegiado) {
      errores.push('Falta el campo colegiado');
    } else if (!/^[A-Za-z0-9-]{1,20}$/.test(colegiado)) {
      errores.push('El colegiado debe tener hasta 20 letras, digitos o guiones');
    }
  }
}

// ---- desactivar, dar_baja, reactivar ----
// el id debe ser un entero positivo. aqui se rechaza con 400 en lugar
// de usar el centinela 0 de WF-04 y WF-05, porque este flujo ya tiene
// su propio rechazo de datos.
//
// defecto 12.24: antes se convertia con Number(), y Number(true) es 1,
// de modo que "id": true desactivaba o daba de baja a la persona 1. ahora
// solo se acepta un numero o un texto que contenga un entero positivo,
// igual que id_medico_solicitado en WF-01 (defecto 12.23).
let id = null;
if (['desactivar', 'dar_baja', 'reactivar'].includes(accion)) {
  const valorId = (typeof datos.id === 'number' || typeof datos.id === 'string')
    ? String(datos.id).trim()
    : '';
  if (/^[1-9]\d*$/.test(valorId)) {
    id = Number(valorId);
  } else {
    errores.push('El id debe ser un entero positivo');
  }
}

// la ruta es la salida que tomara el Switch. desactivar y dar_baja
// comparten camino: solo difieren en la bandera baja, que decide si
// se escribe baja_en.
let ruta = null;
if (errores.length === 0) {
  const tramo = accion === 'agregar'   ? 'agregar'
              : accion === 'reactivar' ? 'reactivar'
              : 'estado';
  ruta = entidad + '_' + tramo;
}

return [{
  json: {
    valido: errores.length === 0,
    errores: errores,
    rol: $('Verifica token').first().json.rol,
    ruta: ruta,
    accion: accion,
    entidad: entidad,
    id: id,
    baja: accion === 'dar_baja',
    nombre: nombre,
    especialidad: especialidad,
    colegiado: colegiado
  }
}];
}

wf09_valida_datos.meta = {"flujo":"WF-09 Administracion de personas","nodo":"Valida datos","modo":"runOnceForAllItems","asincrona":false,"variables":["$()"]};

module.exports = wf09_valida_datos;
