// WF-01 Ingesta de solicitudes · Valida datos
// modo: runOnceForAllItems
// usa: $(), $json
//
// ARCHIVO GENERADO por extraer_nodos.js a partir de workflows/WF-01_ingesta.json
// no editar a mano: los cambios se hacen en n8n, se exporta el
// flujo y se vuelve a ejecutar npm run extraer.

'use strict';

function wf01_valida_datos($input, $, $json, $env, DateTime) {
// valida los datos de la solicitud antes de tocar la base.
// en guatemala el dpi son 13 digitos y el telefono 8,
// empezando entre 2 y 8.
const datos = $('Hash del token').first().json.datos || {};
const errores = [];

// cambio 5: el catalogo de medicos activos llega del nodo anterior.
// el driver de postgres normalmente entrega la columna json ya como
// arreglo, pero si llegara como texto se convierte aqui.
let medicosActivos = $('Lee medicos activos').first().json.medicos || [];
if (typeof medicosActivos === 'string') {
  medicosActivos = JSON.parse(medicosActivos);
}

// cambio 5: compara textos sin importar mayusculas ni tildes, para que
// "pediatría" y "Pediatria" se reconozcan como la misma especialidad.
function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

// convierte un texto AAAA-MM-DD en fecha solo si existe en el
// calendario. javascript acepta "2026-02-30" y lo corre al 2 de
// marzo sin avisar, pero postgresql lo rechaza en el ::date y el
// error terminaba en WF-00. por eso se compara que el dia, el mes
// y el anio resultantes sean los mismos que se escribieron.
function fechaReal(texto) {
  const valor = String(texto || '').trim();
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return null;
  const [, anio, mes, dia] = partes.map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  if (fecha.getFullYear() !== anio || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }
  return fecha;
}

const dpi = String(datos.dpi || '').trim();
if (!/^\d{13}$/.test(dpi)) {
  errores.push('El DPI debe tener exactamente 13 digitos');
}

const telefono = String(datos.telefono || '').trim();
if (telefono && !/^[2-8]\d{7}$/.test(telefono)) {
  errores.push('El telefono debe tener 8 digitos y empezar entre 2 y 8');
}

const correo = String(datos.correo || '').trim();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) {
  errores.push('El correo no tiene un formato valido');
}

// la fecha preferida no puede quedar en el pasado
const hoy = new Date();
hoy.setHours(0, 0, 0, 0);
const fechaPref = fechaReal(datos.fecha_preferida);
if (!fechaPref) {
  errores.push('La fecha preferida no es una fecha valida');
} else if (fechaPref < hoy) {
  errores.push('La fecha preferida no puede estar en el pasado');
}

const tipos = ['urgencia', 'control', 'general'];
if (!tipos.includes(datos.tipo_consulta)) {
  errores.push('El tipo de consulta debe ser urgencia, control o general');
}

for (const campo of ['nombre', 'apellido', 'fecha_nacimiento']) {
  if (!String(datos[campo] || '').trim()) {
    errores.push('Falta el campo ' + campo);
  }
}

// la fecha de nacimiento antes solo se revisaba como presente:
// "abc" pasaba y hacia fallar el ::date de Guarda solicitud, y una
// fecha futura se guardaba sin objecion. si viene vacia, el error
// ya lo agrego el ciclo anterior.
if (String(datos.fecha_nacimiento || '').trim()) {
  const fechaNac = fechaReal(datos.fecha_nacimiento);
  if (!fechaNac) {
    errores.push('La fecha de nacimiento debe ser una fecha valida con formato AAAA-MM-DD');
  } else if (fechaNac > hoy) {
    errores.push('La fecha de nacimiento no puede estar en el futuro');
  } else if (fechaNac.getFullYear() < 1900) {
    errores.push('La fecha de nacimiento no puede ser anterior a 1900');
  }
}

if (String(datos.motivo || '').length > 255) {
  errores.push('El motivo no puede exceder 255 caracteres');
}

// ---- preferencias del paciente ----
// los cuatro campos son opcionales: su ausencia es lo que le
// indica al sistema que debe decidir el. solo se valida lo que
// el paciente si proporciono.

const franjas = ['manana', 'tarde', 'indiferente'];
const franja = String(datos.franja_preferida || 'indiferente').trim();
if (!franjas.includes(franja)) {
  errores.push('La franja debe ser manana, tarde o indiferente');
}

// la hora se valida contra las dos franjas reales de la clinica:
// 08:00 a 12:00 y 13:30 a 17:00. el hueco del almuerzo no existe
// como franja, de modo que una hora ahi se rechaza.
let hora = String(datos.hora_solicitada || '').trim() || null;
if (hora) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    errores.push('La hora solicitada debe tener el formato HH:MM');
  } else {
    const minutos = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
    const enManana = minutos >= 480 && minutos < 720;
    const enTarde  = minutos >= 810 && minutos < 1020;
    if (!enManana && !enTarde) {
      errores.push('La hora solicitada debe estar entre 08:00 y 12:00 o entre 13:30 y 17:00');
    }
    if (franja === 'manana' && !enManana) {
      errores.push('La hora solicitada no corresponde a la franja de la manana');
    }
    if (franja === 'tarde' && !enTarde) {
      errores.push('La hora solicitada no corresponde a la franja de la tarde');
    }
  }
}

// cambio 5: la especialidad se contrasta contra los medicos activos.
// antes se aceptaba cualquier texto: "Cardiologia" pasaba y la
// solicitud nunca encontraba medico. si coincide, se devuelve con la
// escritura exacta de la base, que es con la que compara WF-02.
let especialidad = String(datos.especialidad_solicitada || '').trim() || null;
if (especialidad) {
  const encontrada = medicosActivos.find(m => normalizar(m.especialidad) === normalizar(especialidad));
  if (encontrada) {
    especialidad = encontrada.especialidad;
  } else {
    errores.push('No hay medicos activos con la especialidad ' + especialidad);
    especialidad = null;
  }
}

// cambio 5: el medico solicitado se contrasta contra los activos.
// antes este comentario decia que la consulta siguiente verificaba
// que existiera y estuviera activo, pero ninguna lo hacia: un id
// inexistente violaba la llave foranea y terminaba en WF-00, y uno
// inactivo dejaba la solicitud en lista de espera para siempre.
//
// defecto 12.23: antes se convertia con Number(), y Number(true) es 1,
// de modo que "id_medico_solicitado": true asignaba la cita al medico 1
// sin que nadie lo pidiera. ahora solo se acepta un numero o un texto
// que contenga un entero positivo, igual que id_cita en WF-04 y WF-05.
let idMedico = datos.id_medico_solicitado;
let medicoPedido = null;
if (idMedico !== undefined && idMedico !== null && idMedico !== '') {
  const valorMedico = (typeof idMedico === 'number' || typeof idMedico === 'string')
    ? String(idMedico).trim()
    : '';
  if (!/^[1-9]\d*$/.test(valorMedico)) {
    errores.push('El medico solicitado debe ser un identificador valido');
    idMedico = null;
  } else {
    idMedico = Number(valorMedico);
    medicoPedido = medicosActivos.find(m => m.id === idMedico) || null;
    if (!medicoPedido) {
      errores.push('El medico solicitado no existe o no esta activo');
      idMedico = null;
    }
  }
} else {
  idMedico = null;
}

// cambio 5: si vienen los dos, deben coincidir. es la misma idea que
// rechazar la franja tarde con una hora de la manana.
if (medicoPedido && especialidad && medicoPedido.especialidad !== especialidad) {
  errores.push('El medico solicitado no pertenece a la especialidad ' + especialidad);
}

// el dpi se enmascara para que nunca aparezca completo en logs
const dpiEnmascarado = dpi.length >= 4 ? '*'.repeat(9) + dpi.slice(-4) : '****';

// los datos siguen al proximo nodo ya recortados: los mismos valores
// que se acaban de validar. antes se devolvia el cuerpo original, y un
// dpi con espacios pasaba la validacion pero generaba otra huella en
// Cifra datos sensibles: el on conflict no lo detectaba y el mismo
// paciente quedaba registrado dos veces.
const datosLimpios = {
  ...datos,
  dpi: dpi,
  telefono: telefono,
  correo: correo,
  nombre: String(datos.nombre || '').trim(),
  apellido: String(datos.apellido || '').trim(),
  fecha_nacimiento: String(datos.fecha_nacimiento || '').trim(),
  fecha_preferida: String(datos.fecha_preferida || '').trim()
};

return [{
  json: {
    valido: errores.length === 0,
    errores: errores,
    // cambio 5: el rol ya no llega en $json, porque entre Verifica
    // token y este nodo ahora esta Lee medicos activos
    rol: $('Verifica token').first().json.rol,
    dpi_enmascarado: dpiEnmascarado,
    franja_preferida: franja,
    hora_solicitada: hora,
    especialidad_solicitada: especialidad,
    id_medico_solicitado: idMedico,
    datos: datosLimpios
  }
}];
}

wf01_valida_datos.meta = {"flujo":"WF-01 Ingesta de solicitudes","nodo":"Valida datos","modo":"runOnceForAllItems","asincrona":false,"variables":["$()","$json"]};

module.exports = wf01_valida_datos;
