// ============================================================
// SIGAC - Recopilacion de los nodos Code de n8n
//
// Documento de referencia: el codigo de cada nodo Code tal como
// esta publicado en n8n, separado por flujo. No se ejecuta: VS Code
// marca errores (return fuera de funcion, crypto declarado varias
// veces) porque son bloques sueltos.
//
// 57 nodos Code en total.
//
// Actualizado con las seis correcciones del commit 38e8d38:
//   1. WF-01 Valida datos     datos recortados antes de cifrar
//   2. WF-04 / WF-05 Hash     id_cita validado como entero
//   3. WF-01 Valida datos     fechas validadas contra el calendario
//   4. WF-02 Reparte cupos    cupos por franja y primer hueco libre
//   5. WF-06 Compone reporte  semana ISO con Luxon
//   6. WF-07 / WF-08          rechazos con estado: 'rechazado'
//
// Actualizado el 23 de octubre de 2026 con el cambio 5
// (administracion de personas), commits 385fe79 a 0c6f24c:
//   7. WF-01 Valida datos     catalogo de medicos activos (12.18 a 12.20)
//   8. WF-01 Rechazo 409      paciente inactivo (12.21)
//   9. WF-09 completo         20 nodos Code nuevos
//
// Los nodos marcados con "Corregido: punto N" o "Nuevo: punto N"
// son los que cambiaron en cada actualizacion.
// ============================================================


// ============================================================
// WF-00 - Manejador de errores
// Sin nodos Code.
// ============================================================


// ============================================================
// WF-01 - Ingesta de solicitudes
// ============================================================

// ------------------------------------------------------------
// Nodo: Hash del token  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// lee el token de la cabecera y calcula su sha-256.
// nunca se compara el token en claro contra la base:
// se compara hash contra hash.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

// si no viene token se usa un centinela en lugar de cadena vacia.
// con la consulta parametrizada, un valor vacio hace que n8n no envie
// el parametro y PostgreSQL rechaza la consulta. 'sin-token' nunca
// puede coincidir con un sha-256, que solo contiene hexadecimales.
const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

return [{
  json: {
    token_hash: tokenHash,
    tiene_token: token.length > 0,
    datos: cuerpo
  }
}];


// ------------------------------------------------------------
// Nodo: Valida datos  |  Mode: Run Once for All Items
// Corregido: puntos 1, 3 y 7.
// Punto 7: lee el catalogo de Lee medicos activos, que es un nodo
// Postgres nuevo entre ¿Rol autorizado? y este nodo.
// ------------------------------------------------------------
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
let idMedico = datos.id_medico_solicitado;
let medicoPedido = null;
if (idMedico !== undefined && idMedico !== null && idMedico !== '') {
  idMedico = Number(idMedico);
  if (!Number.isInteger(idMedico) || idMedico < 1) {
    errores.push('El medico solicitado debe ser un identificador valido');
    idMedico = null;
  } else {
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


// ------------------------------------------------------------
// Nodo: Cifra datos sensibles  |  Mode: Run Once for Each Item
// ------------------------------------------------------------
// cifra los campos sensibles con AES-256-GCM.
// a diferencia de un hash, esto es reversible: WF-03 necesita
// el telefono real para notificar al paciente.
//
// formato almacenado:  iv:textoCifrado:etiqueta
// el iv es aleatorio en cada operacion, asi que dos cifrados del
// mismo dato dan resultados distintos. por eso existe ademas
// dpi_huella, que si es determinista y permite buscar.
const crypto = require('crypto');

const clave = Buffer.from($env.SIGAC_CLAVE_CIFRADO, 'hex');
if (clave.length !== 32) {
  throw new Error('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes (64 caracteres hex)');
}

function cifrar(texto) {
  if (!texto) return null;
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const cifrado = Buffer.concat([cifrador.update(String(texto), 'utf8'), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  return [iv.toString('hex'), cifrado.toString('hex'), etiqueta.toString('hex')].join(':');
}

const datos = $json.datos;

return {
  json: {
    ...$json,
    dpi_cifrado: cifrar(datos.dpi),
    dpi_huella: crypto.createHash('sha256').update(String(datos.dpi)).digest('hex'),
    telefono_cifrado: cifrar(datos.telefono)
  }
};


// ------------------------------------------------------------
// Nodo: Registro exitoso  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// solicitud registrada y auditada.
// se devuelve el id para que el emisor pueda dar seguimiento.
return [{
  json: {
    codigo: 201,
    estado: 'registrado',
    mensaje: 'Solicitud de cita registrada',
    id_solicitud: $('Guarda solicitud').first().json.id_solicitud,
    estado_solicitud: $('Guarda solicitud').first().json.estado,
    hash_auditoria: $json.hash_actual
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 401  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// token ausente o invalido.
// el mensaje es generico a proposito: no se revela si el token
// existe pero esta inactivo, ni si el rol es incorrecto.
return [{
  json: {
    codigo: 401,
    estado: 'rechazado',
    mensaje: 'Token ausente o invalido'
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 403  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// el token es valido pero el rol no tiene permiso para
// crear citas. solo recepcion puede hacerlo.
return [{
  json: {
    codigo: 403,
    estado: 'rechazado',
    mensaje: 'El rol no autoriza esta operacion'
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 400  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// los datos no pasaron la validacion.
// se devuelve el detalle para que el emisor sepa que corregir.
return [{
  json: {
    codigo: 400,
    estado: 'rechazado',
    mensaje: 'Datos invalidos',
    errores: $json.errores
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 409  |  Mode: Run Once for All Items
// Nuevo: punto 8. Lo alimenta la salida false de ¿Paciente
// habilitado?, un If nuevo despues de Guarda solicitud.
// ------------------------------------------------------------
// cambio 5: el paciente existe pero esta inactivo o dado de baja.
// 409 y no 403: el token y el rol son validos, lo que impide la
// operacion es el estado del paciente.
return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente no esta habilitado para solicitar citas' } }];


// ============================================================
// WF-02 - Clasificacion y asignacion
// ============================================================

// ------------------------------------------------------------
// Nodo: Calcula prioridad  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// la prioridad sale del tipo de consulta: 1 mayor urgencia, 5 menor.
// el turno reparte los items del mismo lote en horarios distintos,
// porque todos se evaluan antes de que se inserte ninguna cita.
//
// los cuatro campos de preferencia se propagan tal cual: este nodo
// no decide nada sobre ellos, pero Reparte cupos los necesita para
// respetar lo que el paciente si pidio.
const tipos = { urgencia: 1, control: 3, general: 5 };

return $input.all().map((item, i) => ({
  json: {
    id_solicitud: item.json.id,
    id_paciente: item.json.id_paciente,
    tipo_consulta: item.json.tipo_consulta,
    fecha_preferida: item.json.fecha_preferida,
    prioridad: tipos[item.json.tipo_consulta] || 5,
    turno: i,
    franja_preferida: item.json.franja_preferida,
    hora_solicitada: item.json.hora_solicitada,
    especialidad_solicitada: item.json.especialidad_solicitada,
    id_medico_solicitado: item.json.id_medico_solicitado
  }
}));


// ------------------------------------------------------------
// Nodo: Reparte cupos  |  Mode: Run Once for All Items
// Corregido: punto 4. Depende de que Busca cupo devuelva
// ocupados por franja y horas_ocupadas.
// ------------------------------------------------------------
// Busca cupo devuelve las franjas repetidas una vez por cada solicitud
// de entrada, asi que primero hay que quedarse con cada franja una vez.
const vistas = new Set();
const franjas = [];

// convierte "HH:MM" o "HH:MM:SS" en minutos desde medianoche
function aMinutos(texto) {
  const [h, m] = String(texto).split(':').map(Number);
  return h * 60 + m;
}

for (const f of $('Busca cupo').all()) {
  if (!f.json.id_medico) continue;
  const clave = f.json.id_medico + '|' + f.json.hora_inicio;
  if (vistas.has(clave)) continue;
  vistas.add(clave);

  const inicio = aMinutos(f.json.hora_inicio);
  const fin    = aMinutos(f.json.hora_fin);

  // horas que ya estan ocupadas en la base dentro de esta franja.
  // antes solo se conocia el conteo, y el calculo suponia que las
  // citas ocupaban la franja en orden y sin huecos: una cita pedida
  // a las 10:00 podia terminar asignada otra vez a otro paciente.
  const tomadas = String(f.json.horas_ocupadas || '')
    .split(',')
    .filter(Boolean)
    .map(aMinutos);

  franjas.push({
    id_medico: f.json.id_medico,
    especialidad: f.json.especialidad,
    inicio: inicio,
    fin: fin,
    // la franja de la manana empieza antes del mediodia
    nombre: inicio < 720 ? 'manana' : 'tarde',
    libres: Number(f.json.cupos) - Number(f.json.ocupados),
    ocupados: Number(f.json.ocupados),
    tomadas: tomadas
  });
}

// convierte minutos desde medianoche al formato HH:MM:SS
function aHora(min) {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' +
         String(min % 60).padStart(2, '0') + ':00';
}

// reparte las solicitudes entre las franjas con cupo disponible.
// se hace aqui y no en SQL porque todos los items se evaluan antes
// de que se inserte ninguna cita: la base todavia no refleja las
// asignaciones de este mismo lote.
//
// el sistema decide unicamente lo que el paciente no decidio: si
// pidio medico, especialidad u hora, se respeta; lo que no pidio,
// se resuelve aqui.
const solicitudes = $('Calcula prioridad').all();
const salida = [];

for (const s of solicitudes) {
  const d = s.json;

  // 1. candidatas: franjas con cupo que cumplan lo que el paciente pidio
  let candidatas = franjas.filter(f => f.libres > 0);

  if (d.id_medico_solicitado) {
    // pidio medico: solo ese. la especialidad se deduce de el.
    candidatas = candidatas.filter(f => f.id_medico === Number(d.id_medico_solicitado));
  } else {
    // sin medico pedido, la especialidad manda. si no la pidio,
    // va a Medicina General, que es el medico de primer contacto.
    const esp = d.especialidad_solicitada || 'Medicina General';
    candidatas = candidatas.filter(f => f.especialidad === esp);
  }

  const franjaPedida = d.franja_preferida && d.franja_preferida !== 'indiferente'
    ? d.franja_preferida
    : null;
  if (franjaPedida) {
    candidatas = candidatas.filter(f => f.nombre === franjaPedida);
  }

  // 2. si pidio hora exacta, solo sirve la franja que la contiene
  //    y solo si ese minuto no esta ya tomado, ni en la base ni en
  //    este mismo lote
  let horaExacta = null;
  if (d.hora_solicitada) {
    horaExacta = aMinutos(d.hora_solicitada);
    candidatas = candidatas.filter(f =>
      horaExacta >= f.inicio &&
      horaExacta < f.fin &&
      !f.tomadas.includes(horaExacta)
    );
  }

  // 3. entre las que quedan, la del medico con menos carga
  candidatas.sort((a, b) => a.ocupados - b.ocupados);
  const franja = candidatas[0];

  if (!franja) {
    salida.push({ json: { ...d, id_medico: null, hora_inicio: null } });
    continue;
  }

  // 4. calcular el minuto concreto
  let minuto = null;
  if (horaExacta !== null) {
    minuto = horaExacta;
  } else {
    // primer hueco de 30 minutos que no este tomado. antes se usaba
    // inicio + 30 * ocupados, que choca con las horas pedidas por
    // otros pacientes y con las citas que ya existian en la base.
    for (let m = franja.inicio; m < franja.fin; m += 30) {
      if (!franja.tomadas.includes(m)) {
        minuto = m;
        break;
      }
    }
    // si no queda ningun hueco libre en la franja, no hay cupo real
    if (minuto === null) {
      salida.push({ json: { ...d, id_medico: null, hora_inicio: null } });
      continue;
    }
  }

  franja.libres -= 1;
  franja.ocupados += 1;
  franja.tomadas.push(minuto);

  salida.push({
    json: { ...d, id_medico: franja.id_medico, hora_inicio: aHora(minuto) }
  });
}

return salida;


// ============================================================
// WF-03 - Notificacion y expediente
// Sin nodos Code: Schedule Trigger, Postgres y Send Email.
// La fecha del correo se formatea con una expresion de Luxon
// dentro del nodo Send Email; se verifica en integracion.
// ============================================================


// ============================================================
// WF-04 - Reasignacion de cupos
// ============================================================

// ------------------------------------------------------------
// Nodo: Hash del token  |  Mode: Run Once for All Items
// Version propia de WF-04: extrae id_cita y motivo del cuerpo.
// Corregido: punto 2.
// ------------------------------------------------------------
// misma autenticacion que WF-01: se compara hash contra hash,
// nunca el token en claro.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

// id_cita debe ser un entero positivo. cualquier otra cosa ("abc",
// "12.5", true) se reemplaza por el centinela 0: ninguna cita tiene
// id 0, asi que termina en el Rechazo 404. antes un valor no numerico
// llegaba a la consulta, el ::int fallaba y el error caia en WF-00.
const valorCita = String(cuerpo.id_cita ?? '').trim();
const idCita = /^[1-9]\d*$/.test(valorCita) ? Number(valorCita) : 0;

return [{
  json: {
    token_hash: tokenHash,
    id_cita: idCita,
    motivo: cuerpo.motivo || 'sin motivo'
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 401  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// token ausente, invalido, o rol sin permiso para cancelar.
// mensaje generico a proposito.
return [{
  json: {
    codigo: 401,
    estado: 'rechazado',
    mensaje: 'Token ausente o invalido, o rol sin autorizacion'
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 404  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// la cita no existe o ya no estaba confirmada.
return [{
  json: {
    codigo: 404,
    estado: 'rechazado',
    mensaje: 'La cita no existe o no estaba confirmada'
  }
}];


// ------------------------------------------------------------
// Nodo: Cancelado sin reasignar  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// se cancelo la cita pero nadie esperaba ese dia.
// el cupo queda libre para futuras solicitudes.
return [{
  json: {
    codigo: 200,
    estado: 'cancelado',
    mensaje: 'Cita cancelada. No habia nadie en lista de espera para esa fecha',
    id_cita_cancelada: $('Cancela cita').first().json.id_cita
  }
}];


// ------------------------------------------------------------
// Nodo: Reasignacion exitosa  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// cita cancelada y cupo reasignado al siguiente en espera.
return [{
  json: {
    codigo: 200,
    estado: 'reasignado',
    mensaje: 'Cita cancelada y cupo reasignado',
    id_cita_cancelada: $('Cancela cita').first().json.id_cita,
    id_cita_nueva: $json.id_cita_nueva,
    id_solicitud_beneficiada: $json.id_solicitud
  }
}];


// ============================================================
// WF-05 - Cierre de cita
// ============================================================

// ------------------------------------------------------------
// Nodo: Hash del token  |  Mode: Run Once for All Items
// Version propia de WF-05: extrae id_cita y valida resultado.
// Corregido: punto 2.
// ------------------------------------------------------------
// misma autenticacion que los demas flujos: se compara hash
// contra hash, nunca el token en claro.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

// solo se aceptan estos dos resultados de cierre
const resultado = ['atendida', 'ausente'].includes(cuerpo.resultado)
  ? cuerpo.resultado
  : null;

// id_cita debe ser un entero positivo. cualquier otra cosa ("abc",
// "12.5", true) se reemplaza por el centinela 0: ninguna cita tiene
// id 0, asi que termina en el Rechazo 404. antes un valor no numerico
// llegaba a la consulta, el ::int fallaba y el error caia en WF-00.
const valorCita = String(cuerpo.id_cita ?? '').trim();
const idCita = /^[1-9]\d*$/.test(valorCita) ? Number(valorCita) : 0;

return [{
  json: {
    token_hash: tokenHash,
    id_cita: idCita,
    resultado: resultado || 'invalido'
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 401  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// token ausente, invalido, o rol sin permiso para cerrar citas.
// el cierre lo hace el medico que atendio, no recepcion.
return [{
  json: {
    codigo: 401,
    estado: 'rechazado',
    mensaje: 'Token ausente o invalido, o rol sin autorizacion'
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 404  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// la cita no existe, ya fue cerrada o cancelada, es una cita
// futura, o el resultado enviado no era atendida ni ausente.
// mensaje unico a proposito: no se revela cual de los casos es.
return [{
  json: {
    codigo: 404,
    estado: 'rechazado',
    mensaje: 'La cita no existe o no esta en condiciones de cerrarse'
  }
}];


// ------------------------------------------------------------
// Nodo: Cierre exitoso  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// la cita queda cerrada. el horario NO se libera: a diferencia
// de una cancelacion, aqui la consulta si ocurrio o el paciente
// no se presento, pero el cupo se consumio igual.
return [{
  json: {
    codigo: 200,
    estado: 'cerrada',
    mensaje: 'Cita cerrada correctamente',
    id_cita: $json.id_cita,
    resultado: $json.estado
  }
}];


// ============================================================
// WF-06 - Reporte semanal
// ============================================================

// ------------------------------------------------------------
// Nodo: Compone el reporte  |  Mode: Run Once for All Items
// Usa this.helpers.prepareBinaryData y DateTime, propios de n8n.
// Corregido: punto 5.
// ------------------------------------------------------------
// el reporte es agregado: solo conteos y nombres de medicos.
// no lleva ningun dato de paciente, ni siquiera enmascarado.
const ind = $('Reune indicadores').first().json;
const medicos = $('Carga por medico').all().map(m => m.json);

// la semana se calcula con luxon, que trae la semana ISO del
// calendario: empieza en lunes y la semana 1 es la que contiene el
// primer jueves del anio. el calculo anterior contaba bloques de 7
// dias desde el 1 de enero y se desfasaba una semana en 2026.
// el anio es el de la semana ISO: el 1 de enero puede pertenecer
// todavia a la ultima semana del anio anterior.
const ahora  = DateTime.now().setZone('America/Guatemala');
const fecha  = ahora.toFormat('dd/MM/yyyy');
const semana = ahora.weekNumber;
const anio   = ahora.weekYear;

const filasMedicos = medicos.map(m => `
  <tr>
    <td>${m.nombre}</td>
    <td>${m.especialidad}</td>
    <td class="n">${m.atendidas}</td>
    <td class="n">${m.confirmadas}</td>
    <td class="n">${m.ausentes}</td>
  </tr>`).join('');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<style>
  body { font-family: Helvetica, Arial, sans-serif; color: #1a1a1a; margin: 40px; }
  h1 { font-size: 20px; margin: 0 0 4px 0; color: #1B2A5E; }
  .sub { font-size: 12px; color: #666; margin-bottom: 24px; }
  h2 { font-size: 13px; margin: 24px 0 8px 0; color: #1B2A5E;
       border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { text-align: left; background: #f2f4f8; padding: 6px 8px; font-weight: bold; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; }
  td.n, th.n { text-align: right; }
  .nota { font-size: 10px; color: #777; margin: 4px 0 12px 0; }
  .pie { margin-top: 32px; font-size: 9px; color: #888;
         border-top: 1px solid #ddd; padding-top: 8px; }
</style>
</head>
<body>

<h1>SIGAC — Reporte semanal de indicadores</h1>
<div class="sub">Semana ${semana} del ${anio} &middot; Generado el ${fecha}</div>

<h2>Actividad de los ultimos 7 dias</h2>
<table>
  <tr><td>Solicitudes recibidas</td><td class="n">${ind.sol_semana}</td></tr>
  <tr><td>Citas creadas</td><td class="n">${ind.citas_semana}</td></tr>
  <tr><td>Errores de severidad alta</td><td class="n">${ind.errores_alta}</td></tr>
  <tr><td>Errores de severidad media</td><td class="n">${ind.errores_media}</td></tr>
  <tr><td>Errores de severidad baja</td><td class="n">${ind.errores_baja}</td></tr>
</table>

<h2>Citas por estado (acumulado)</h2>
<table>
  <tr><td>Confirmadas</td><td class="n">${ind.citas_confirmadas}</td></tr>
  <tr><td>Atendidas</td><td class="n">${ind.citas_atendidas}</td></tr>
  <tr><td>Canceladas</td><td class="n">${ind.citas_canceladas}</td></tr>
  <tr><td>Ausentes</td><td class="n">${ind.citas_ausentes}</td></tr>
</table>

<h2>Solicitudes por estado (acumulado)</h2>
<table>
  <tr><td>Pendientes de clasificar</td><td class="n">${ind.sol_pendientes}</td></tr>
  <tr><td>Asignadas</td><td class="n">${ind.sol_asignadas}</td></tr>
  <tr><td>En lista de espera</td><td class="n">${ind.sol_en_espera}</td></tr>
  <tr><td>Rechazadas</td><td class="n">${ind.sol_rechazadas}</td></tr>
</table>

<h2>Carga por medico (acumulado)</h2>
<table>
  <tr>
    <th>Medico</th><th>Especialidad</th>
    <th class="n">Atendidas</th><th class="n">Confirmadas</th><th class="n">Ausentes</th>
  </tr>
  ${filasMedicos}
</table>

<h2>Lista de espera (estado actual)</h2>
<table>
  <tr><td>Solicitudes aguardando cupo</td><td class="n">${ind.espera_pendientes}</td></tr>
  <tr><td>Reasignaciones completadas</td><td class="n">${ind.espera_atendidas}</td></tr>
</table>

<div class="pie">
  Documento generado automaticamente por SIGAC.
  Contiene unicamente informacion agregada: no incluye datos identificativos
  ni clinicos de ningun paciente. Pacientes registrados activos:
  ${ind.pacientes_activos}.
  <br><br>
  Los indicadores marcados como acumulado reflejan el estado total del sistema
  y no el periodo semanal. La base registra la fecha de creacion de cada cita,
  pero no la fecha en que cambia de estado, de modo que no es posible acotar
  por semana cuantas citas fueron atendidas o canceladas.
</div>

</body>
</html>`;

return [{
  json: {
    nombre_archivo: `semana_${anio}-${String(semana).padStart(2, '0')}.pdf`,
    semana: semana,
    anio: anio
  },
  binary: {
    'index.html': await this.helpers.prepareBinaryData(
      Buffer.from(html, 'utf8'),
      'index.html',
      'text/html'
    )
  }
}];


// ------------------------------------------------------------
// Nodo: Nombra el archivo  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// gotenberg devuelve el binario sin nombre util, asi que el correo
// lo adjuntaba con un identificador aleatorio. aqui se le pone el
// mismo nombre con que se guarda en disco.
const nombre = $('Compone el reporte').first().json.nombre_archivo;
const item = $input.first();

item.binary.data.fileName = nombre;
item.binary.data.fileExtension = 'pdf';
item.binary.data.mimeType = 'application/pdf';

return [item];


// ============================================================
// WF-07 - Registro de nota clinica
// ============================================================

// ------------------------------------------------------------
// Nodo: Hash del token  |  Mode: Run Once for All Items
// Identico al de WF-01.
// ------------------------------------------------------------
// lee el token de la cabecera y calcula su sha-256.
// nunca se compara el token en claro contra la base:
// se compara hash contra hash.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

// si no viene token se usa un centinela en lugar de cadena vacia.
// con la consulta parametrizada, un valor vacio hace que n8n no envie
// el parametro y PostgreSQL rechaza la consulta. 'sin-token' nunca
// puede coincidir con un sha-256, que solo contiene hexadecimales.
const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

return [{
  json: {
    token_hash: tokenHash,
    tiene_token: token.length > 0,
    datos: cuerpo
  }
}];


// ------------------------------------------------------------
// Nodo: Valida datos  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// valida el cuerpo de la nota clinica. igual que WF-01, los
// errores se acumulan y se devuelven todos en una sola respuesta.
//
// el id_medico NO se lee del cuerpo: sale del token verificado.
// asi nadie puede firmar una nota a nombre de otro medico.
const cuerpo = $('Hash del token').first().json.datos || {};
const medico = $('Verifica token').first().json;

const errores = [];
const MAX = 2000;

const idCita = Number(cuerpo.id_cita);
if (!Number.isInteger(idCita) || idCita <= 0) {
  errores.push('id_cita debe ser un entero positivo');
}

const diagnostico = typeof cuerpo.diagnostico === 'string' ? cuerpo.diagnostico.trim() : '';
if (!diagnostico) {
  errores.push('diagnostico es obligatorio');
} else if (diagnostico.length > MAX) {
  errores.push(`diagnostico no puede exceder ${MAX} caracteres`);
}

// indicaciones es opcional: una consulta puede no requerir tratamiento
let indicaciones = null;
if (cuerpo.indicaciones !== undefined && cuerpo.indicaciones !== null && cuerpo.indicaciones !== '') {
  if (typeof cuerpo.indicaciones !== 'string') {
    errores.push('indicaciones debe ser texto');
  } else {
    indicaciones = cuerpo.indicaciones.trim();
    if (indicaciones.length > MAX) {
      errores.push(`indicaciones no puede exceder ${MAX} caracteres`);
    }
  }
}

return [{
  json: {
    valido: errores.length === 0,
    errores,
    id_cita: idCita,
    id_medico: medico.id_medico,
    diagnostico,
    indicaciones
  }
}];


// ------------------------------------------------------------
// Nodo: Cifra la nota  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// cifra diagnostico e indicaciones con AES-256-GCM, misma funcion
// y mismo formato que WF-01:  iv:textoCifrado:etiqueta
//
// la salida de este nodo ya no lleva el texto clinico en claro:
// solo los valores cifrados y los identificadores.
const crypto = require('crypto');

const clave = Buffer.from($env.SIGAC_CLAVE_CIFRADO, 'hex');
if (clave.length !== 32) {
  throw new Error('SIGAC_CLAVE_CIFRADO debe ser de 32 bytes (64 caracteres hex)');
}

function cifrar(texto) {
  if (!texto) return null;
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave, iv);
  const cifrado = Buffer.concat([cifrador.update(String(texto), 'utf8'), cifrador.final()]);
  const etiqueta = cifrador.getAuthTag();
  return [iv.toString('hex'), cifrado.toString('hex'), etiqueta.toString('hex')].join(':');
}

const cita = $input.first().json;
const nota = $('Valida datos').first().json;

return [{
  json: {
    id_expediente: cita.id_expediente,
    id_paciente: cita.id_paciente,
    id_cita: cita.id_cita,
    id_medico: nota.id_medico,
    diagnostico_cifrado: cifrar(nota.diagnostico),
    // centinela: un parametro vacio hace que n8n no lo envie (defecto 7.6).
    // la consulta lo convierte de vuelta en null con nullif (defecto 7.7)
    indicaciones_cifrado: cifrar(nota.indicaciones) ?? 'null'
  }
}];


// ------------------------------------------------------------
// Nodo: Nota registrada  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// respuesta de exito. el texto clinico no se devuelve:
// solo los identificadores y el hash de auditoria.
const nota = $('Guarda nota').first().json;
const bitacora = $input.first().json;

return [{
  json: {
    codigo: 201,
    estado: 'registrada',
    mensaje: 'Nota clinica registrada',
    id_nota: nota.id,
    id_cita: nota.id_cita,
    creado_en: nota.creado_en,
    hash_auditoria: bitacora.hash_actual
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 401  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
return [{ json: { codigo: 401, estado: 'rechazado', mensaje: 'No autorizado' } }];


// ------------------------------------------------------------
// Nodo: Rechazo 403  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
return [{ json: { codigo: 403, estado: 'rechazado', mensaje: 'Operacion no permitida para este rol' } }];


// ------------------------------------------------------------
// Nodo: Rechazo 400  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
return [{ json: { codigo: 400, estado: 'rechazado', mensaje: 'Datos invalidos', errores: $input.first().json.errores } }];


// ------------------------------------------------------------
// Nodo: Rechazo 404  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
// mismo mensaje para cita inexistente, ajena o en estado no valido:
// no se revela si la cita existe pero pertenece a otro medico
return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'Cita no encontrada o no admite nota' } }];


// ============================================================
// WF-08 - Consulta de historial clinico
// ============================================================

// ------------------------------------------------------------
// Nodo: Hash del token  |  Mode: Run Once for All Items
// Identico al de WF-01 y WF-07.
// ------------------------------------------------------------
// lee el token de la cabecera y calcula su sha-256.
// nunca se compara el token en claro contra la base:
// se compara hash contra hash.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

// si no viene token se usa un centinela en lugar de cadena vacia.
// con la consulta parametrizada, un valor vacio hace que n8n no envie
// el parametro y PostgreSQL rechaza la consulta. 'sin-token' nunca
// puede coincidir con un sha-256, que solo contiene hexadecimales.
const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

return [{
  json: {
    token_hash: tokenHash,
    tiene_token: token.length > 0,
    datos: cuerpo
  }
}];


// ------------------------------------------------------------
// Nodo: Valida datos  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// valida el cuerpo de la consulta de historial. el medico solo
// envia el id de la cita que esta por atender: el paciente se
// deduce de la cita, nunca se recibe directamente.
//
// asi un medico no puede pedir el historial de cualquier paciente:
// solo el de un paciente con quien tiene una cita vigente.
const cuerpo = $('Hash del token').first().json.datos || {};
const medico = $('Verifica token').first().json;

const errores = [];

const idCita = Number(cuerpo.id_cita);
if (!Number.isInteger(idCita) || idCita <= 0) {
  errores.push('id_cita debe ser un entero positivo');
}

return [{
  json: {
    valido: errores.length === 0,
    errores,
    id_cita: idCita,
    id_medico: medico.id_medico
  }
}];


// ------------------------------------------------------------
// Nodo: Descifra  |  Mode: Run Once for All Items
// Usa DateTime, propio de n8n.
// ------------------------------------------------------------
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


// ------------------------------------------------------------
// Nodo: Historial listo  |  Mode: Run Once for All Items
// ------------------------------------------------------------
// respuesta de exito. es la unica respuesta del sistema que entrega
// informacion clinica en claro, y solo al medico con cita vigente.
// el acceso ya quedo registrado en la bitacora antes de llegar aqui.
const historial = $('Descifra').first().json;
const bitacora = $input.first().json;

return [{
  json: {
    codigo: 200,
    estado: 'consultado',
    mensaje: historial.total === 0
      ? 'El paciente no tiene notas clinicas previas'
      : 'Historial clinico del paciente',
    id_cita: historial.id_cita,
    total: historial.total,
    notas: historial.notas,
    hash_auditoria: bitacora.hash_actual
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo 401  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
return [{ json: { codigo: 401, estado: 'rechazado', mensaje: 'No autorizado' } }];


// ------------------------------------------------------------
// Nodo: Rechazo 403  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
return [{ json: { codigo: 403, estado: 'rechazado', mensaje: 'Operacion no permitida para este rol' } }];


// ------------------------------------------------------------
// Nodo: Rechazo 400  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
return [{ json: { codigo: 400, estado: 'rechazado', mensaje: 'Datos invalidos', errores: $input.first().json.errores } }];


// ------------------------------------------------------------
// Nodo: Rechazo 404  |  Mode: Run Once for All Items
// Corregido: punto 6.
// ------------------------------------------------------------
// mismo mensaje para cita inexistente, ajena o cancelada:
// no se revela si la cita existe pero pertenece a otro medico
return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'Cita no encontrada o no permite consultar historial' } }];


// ============================================================
// WF-09 - Administracion de personas
// Nuevo: punto 9. Los 20 nodos Code de este flujo son nuevos.
// Todas las respuestas pasan por el mismo nodo Respuesta.
// ============================================================

// ------------------------------------------------------------
// Nodo: Hash del token  |  Mode: Run Once for All Items
// Identico al de WF-01, WF-07 y WF-08.
// ------------------------------------------------------------
// lee el token de la cabecera y calcula su sha-256.
// nunca se compara el token en claro contra la base:
// se compara hash contra hash.
const crypto = require('crypto');

const cabeceras = $input.first().json.headers || {};
const cuerpo    = $input.first().json.body    || {};

const token = cabeceras['x-sigac-token'] || '';

// si no viene token se usa un centinela en lugar de cadena vacia.
// con la consulta parametrizada, un valor vacio hace que n8n no envie
// el parametro y PostgreSQL rechaza la consulta. 'sin-token' nunca
// puede coincidir con un sha-256, que solo contiene hexadecimales.
const tokenHash = token
  ? crypto.createHash('sha256').update(token).digest('hex')
  : 'sin-token';

return [{
  json: {
    token_hash: tokenHash,
    tiene_token: token.length > 0,
    datos: cuerpo
  }
}];


// ------------------------------------------------------------
// Nodo: Valida datos  |  Mode: Run Once for All Items
// Nuevo: punto 9. Calcula la ruta que toma el Switch Ruta.
// ------------------------------------------------------------
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
let id = null;
if (['desactivar', 'dar_baja', 'reactivar'].includes(accion)) {
  id = Number(datos.id);
  if (!Number.isInteger(id) || id < 1) {
    errores.push('El id debe ser un entero positivo');
    id = null;
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


// ------------------------------------------------------------
// Nodo: Rechazo 401  |  Mode: Run Once for All Items
// Igual al de WF-07 y WF-08.
// ------------------------------------------------------------
return [{ json: { codigo: 401, estado: 'rechazado', mensaje: 'No autorizado' } }];


// ------------------------------------------------------------
// Nodo: Rechazo 403  |  Mode: Run Once for All Items
// Igual al de WF-07 y WF-08.
// ------------------------------------------------------------
return [{ json: { codigo: 403, estado: 'rechazado', mensaje: 'Operacion no permitida para este rol' } }];


// ------------------------------------------------------------
// Nodo: Rechazo 400  |  Mode: Run Once for All Items
// Igual al de WF-07 y WF-08.
// ------------------------------------------------------------
return [{ json: { codigo: 400, estado: 'rechazado', mensaje: 'Datos invalidos', errores: $input.first().json.errores } }];


// ------------------------------------------------------------
// Nodo: Genera token  |  Mode: Run Once for All Items
// Ruta recepcionista_agregar.
// Genera token nuevo, Genera token medico y Genera token medico
// nuevo son copias exactas de este nodo, una por ruta.
// ------------------------------------------------------------
// genera el token de la persona nueva: 32 bytes aleatorios en
// hexadecimal, el mismo formato que openssl rand -hex 32.
// a la base solo va la huella. el token en claro viaja una sola
// vez, en la respuesta, y este flujo no guarda ejecuciones exitosas.
const crypto = require('crypto');

const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

return [{
  json: {
    ...$input.first().json,
    token: token,
    token_hash: tokenHash
  }
}];


// ------------------------------------------------------------
// Nodo: Recepcionista agregada  |  Mode: Run Once for All Items
// Ruta recepcionista_agregar.
// ------------------------------------------------------------
// 201 con el token en claro: es la unica vez que se muestra.
// el admin debe entregarlo a la recepcionista por un canal seguro.
const r = $input.first().json;

return [{
  json: {
    codigo: 201,
    estado: 'registrado',
    mensaje: 'Recepcionista agregada',
    id_recepcionista: r.id_recepcionista,
    token: $('Genera token').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar',
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Estado recepcionista  |  Mode: Run Once for All Items
// Ruta recepcionista_estado.
// ------------------------------------------------------------
// traduce el resultado de la consulta al codigo de respuesta.
// un solo nodo con tres salidas posibles en lugar de un If y tres
// nodos de respuesta: la decision ya la tomo la base, aqui solo se
// redacta.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe la recepcionista ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista ' + id + ' ya fue dada de baja; la baja es definitiva' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: r.dada_de_baja
      ? 'Recepcionista ' + id + ' dada de baja'
      : 'Recepcionista ' + id + ' desactivada',
    tokens_desactivados: Number(r.tokens_desactivados),
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Genera token nuevo  |  Mode: Run Once for All Items
// Ruta recepcionista_reactivar. Copia exacta de Genera token.
// ------------------------------------------------------------
// genera el token de la persona nueva: 32 bytes aleatorios en
// hexadecimal, el mismo formato que openssl rand -hex 32.
// a la base solo va la huella. el token en claro viaja una sola
// vez, en la respuesta, y este flujo no guarda ejecuciones exitosas.
const crypto = require('crypto');

const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

return [{
  json: {
    ...$input.first().json,
    token: token,
    token_hash: tokenHash
  }
}];


// ------------------------------------------------------------
// Nodo: Recepcionista reactivada  |  Mode: Run Once for All Items
// Ruta recepcionista_reactivar.
// ------------------------------------------------------------
// traduce el resultado de la reactivacion al codigo de respuesta.
// solo en el caso ok se devuelve el token nuevo: en los rechazos
// no se guardo nada, asi que el token generado se descarta.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe la recepcionista ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista ' + id + ' fue dada de baja; la baja es definitiva' } }];
}

if (r.resultado === 'ya_activa') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'La recepcionista ' + id + ' ya esta activa' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: 'Recepcionista ' + id + ' reactivada con token nuevo',
    token: $('Genera token nuevo').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar. El token anterior sigue desactivado',
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Estado paciente  |  Mode: Run Once for All Items
// Ruta paciente_estado.
// ------------------------------------------------------------
// traduce el resultado de la consulta al codigo de respuesta.
// en el caso con_pendientes se informa cuantas citas y solicitudes
// tiene, para que recepcion sepa que debe resolver antes.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

// count(*) llega como texto desde postgres, por eso el Number()
const citas = Number(r.citas_futuras);
const solicitudes = Number(r.solicitudes_pendientes);

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el paciente ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente ' + id + ' ya fue dado de baja; la baja es definitiva' } }];
}

if (r.resultado === 'con_pendientes') {
  return [{
    json: {
      codigo: 409,
      estado: 'rechazado',
      mensaje: 'El paciente ' + id + ' tiene citas o solicitudes en curso; deben cancelarse o resolverse primero',
      citas_futuras: citas,
      solicitudes_pendientes: solicitudes
    }
  }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: r.dado_de_baja
      ? 'Paciente ' + id + ' dado de baja'
      : 'Paciente ' + id + ' desactivado',
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Paciente reactivado  |  Mode: Run Once for All Items
// Ruta paciente_reactivar.
// ------------------------------------------------------------
// traduce el resultado de la reactivacion al codigo de respuesta
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el paciente ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente ' + id + ' fue dado de baja; la baja es definitiva' } }];
}

if (r.resultado === 'ya_activo') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El paciente ' + id + ' ya esta activo' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: 'Paciente ' + id + ' reactivado',
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Genera token medico  |  Mode: Run Once for All Items
// Ruta medico_agregar. Copia exacta de Genera token.
// ------------------------------------------------------------
// genera el token de la persona nueva: 32 bytes aleatorios en
// hexadecimal, el mismo formato que openssl rand -hex 32.
// a la base solo va la huella. el token en claro viaja una sola
// vez, en la respuesta, y este flujo no guarda ejecuciones exitosas.
const crypto = require('crypto');

const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

return [{
  json: {
    ...$input.first().json,
    token: token,
    token_hash: tokenHash
  }
}];


// ------------------------------------------------------------
// Nodo: Medico agregado  |  Mode: Run Once for All Items
// Ruta medico_agregar.
// ------------------------------------------------------------
// traduce el resultado del alta al codigo de respuesta.
// solo en el caso ok se devuelve el token: si el colegiado estaba
// duplicado no se guardo nada y el token generado se descarta.
const r = $input.first().json;
const datos = $('Valida datos').first().json;

if (r.resultado === 'colegiado_duplicado') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'Ya existe un medico con el colegiado ' + datos.colegiado } }];
}

return [{
  json: {
    codigo: 201,
    estado: 'registrado',
    mensaje: 'Medico agregado con el horario estandar',
    id_medico: r.id_medico,
    especialidad: datos.especialidad,
    franjas_de_horario: Number(r.franjas),
    token: $('Genera token medico').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar',
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Genera token medico nuevo  |  Mode: Run Once for All Items
// Ruta medico_reactivar. Copia exacta de Genera token.
// ------------------------------------------------------------
// genera el token de la persona nueva: 32 bytes aleatorios en
// hexadecimal, el mismo formato que openssl rand -hex 32.
// a la base solo va la huella. el token en claro viaja una sola
// vez, en la respuesta, y este flujo no guarda ejecuciones exitosas.
const crypto = require('crypto');

const token = crypto.randomBytes(32).toString('hex');
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

return [{
  json: {
    ...$input.first().json,
    token: token,
    token_hash: tokenHash
  }
}];


// ------------------------------------------------------------
// Nodo: Medico reactivado  |  Mode: Run Once for All Items
// Ruta medico_reactivar.
// ------------------------------------------------------------
// traduce el resultado de la reactivacion al codigo de respuesta.
// solo en el caso ok se devuelve el token nuevo.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el medico ' + id } }];
}

if (r.resultado === 'ya_baja') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El medico ' + id + ' fue dado de baja; la baja es definitiva' } }];
}

if (r.resultado === 'ya_activo') {
  return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El medico ' + id + ' ya esta activo' } }];
}

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: 'Medico ' + id + ' reactivado con token nuevo',
    token: $('Genera token medico nuevo').first().json.token,
    aviso: 'Guarde este token ahora: no se volvera a mostrar. Sus citas anteriores no se restauran',
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Reparte reemplazos  |  Mode: Run Once for All Items
// Ruta medico_estado. Lo alimenta Lee situacion del medico.
// ------------------------------------------------------------
// decide, cita por cita, a que medico pasa o si se cancela. no toca
// la base: trabaja sobre la fotografia que armo Lee situacion del
// medico, y deja el plan listo para Aplica cambio de medico.
//
// regla: la cita conserva su fecha y hora; solo cambia el medico.
// primero se busca en la misma especialidad y, si no hay, en Medicina
// General. entre varios candidatos gana el de menor carga ese dia,
// igual que en WF-02. cada reasignacion se anota en memoria, para que
// la siguiente cita ya la cuente como ocupada.
const lectura = $input.first().json;
const datos = $('Valida datos').first().json;

// las columnas json normalmente llegan ya como objeto; si llegaran
// como texto se convierten aqui
function leer(valor, porDefecto) {
  if (valor === null || valor === undefined) return porDefecto;
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

const medico = leer(lectura.medico, null);
const citas = leer(lectura.citas, []);
const candidatos = leer(lectura.candidatos, []);

if (!medico) {
  return [{ json: { resultado: 'no_existe' } }];
}
if (medico.baja_en) {
  return [{ json: { resultado: 'ya_baja' } }];
}

// "HH:MI" a minutos desde medianoche, para comparar horas como numeros
function minutos(hora) {
  return Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));
}

// ocupacion en memoria: por candidato y por fecha, la lista de horas
const ocupacion = {};
for (const k of candidatos) {
  ocupacion[k.id] = {};
  for (const o of leer(k.ocupadas, [])) {
    if (!ocupacion[k.id][o.fecha]) ocupacion[k.id][o.fecha] = [];
    ocupacion[k.id][o.fecha].push(o.hora);
  }
}

const GENERAL = 'Medicina General';
const mismaEspecialidad = candidatos.filter(k => k.especialidad === medico.especialidad);
const generales = candidatos.filter(k => k.especialidad === GENERAL);

// si el que sale ya es de Medicina General, los dos grupos son el
// mismo y basta con revisar uno
const grupos = medico.especialidad === GENERAL ? [generales] : [mismaEspecialidad, generales];

// devuelve el candidato con menor carga que puede atender la cita,
// o null si ninguno del grupo puede
function buscar(grupo, cita) {
  const m = minutos(cita.hora);
  let mejor = null;

  for (const k of grupo) {
    // la franja de ese dia de la semana que contiene la hora de la cita
    const franja = leer(k.franjas, []).find(f =>
      f.dia === cita.dia && minutos(f.inicio) <= m && m < minutos(f.fin));
    if (!franja) continue;

    const horas = ocupacion[k.id][cita.fecha] || [];

    // ya tiene una cita a esa misma hora
    if (horas.includes(cita.hora)) continue;

    // la franja ya llego a su cupo
    const enFranja = horas.filter(h =>
      minutos(h) >= minutos(franja.inicio) && minutos(h) < minutos(franja.fin)).length;
    if (enFranja >= franja.cupos) continue;

    // menor carga del dia; en empate, el id menor
    const carga = horas.length;
    if (!mejor || carga < mejor.carga || (carga === mejor.carga && k.id < mejor.id)) {
      mejor = { id: k.id, carga: carga };
    }
  }
  return mejor;
}

const reasignar = [];
const cancelar = [];

for (const cita of citas) {
  let elegido = null;
  for (const grupo of grupos) {
    elegido = buscar(grupo, cita);
    if (elegido) break;
  }

  if (elegido) {
    reasignar.push({ id_cita: cita.id, id_medico: elegido.id });
    if (!ocupacion[elegido.id][cita.fecha]) ocupacion[elegido.id][cita.fecha] = [];
    ocupacion[elegido.id][cita.fecha].push(cita.hora);
  } else {
    cancelar.push(cita.id);
  }
}

return [{
  json: {
    resultado: 'ok',
    id_medico: medico.id,
    baja: datos.baja,
    reasignar: reasignar,
    cancelar: cancelar,
    // las dos listas viajan como texto json para la consulta siguiente
    reasignar_json: JSON.stringify(reasignar),
    cancelar_json: JSON.stringify(cancelar)
  }
}];


// ------------------------------------------------------------
// Nodo: Rechazo estado medico  |  Mode: Run Once for All Items
// Ruta medico_estado, salida false de ¿Se puede aplicar?
// ------------------------------------------------------------
// los dos casos en que no se aplica nada: el medico no existe, o ya
// fue dado de baja. ninguna cita se toca y no se escribe en la bitacora.
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

if (r.resultado === 'no_existe') {
  return [{ json: { codigo: 404, estado: 'rechazado', mensaje: 'No existe el medico ' + id } }];
}

return [{ json: { codigo: 409, estado: 'rechazado', mensaje: 'El medico ' + id + ' ya fue dado de baja; la baja es definitiva' } }];


// ------------------------------------------------------------
// Nodo: Medico desactivado  |  Mode: Run Once for All Items
// Ruta medico_estado, rama de la respuesta de Aplica cambio de medico.
// ------------------------------------------------------------
// respuesta 200 con el resumen de lo que paso con las citas del medico.
// los conteos llegan como texto desde postgres, por eso el Number().
const r = $input.first().json;
const id = $('Valida datos').first().json.id;

return [{
  json: {
    codigo: 200,
    estado: 'actualizado',
    mensaje: r.dado_de_baja
      ? 'Medico ' + id + ' dado de baja'
      : 'Medico ' + id + ' desactivado',
    citas_reasignadas: Number(r.reasignadas),
    citas_canceladas: Number(r.canceladas),
    preferencias_liberadas: Number(r.preferencias_liberadas),
    tokens_desactivados: Number(r.tokens_desactivados),
    hash_auditoria: r.hash_auditoria
  }
}];


// ------------------------------------------------------------
// Nodo: Prepara correos  |  Mode: Run Once for All Items
// Ruta medico_estado, rama de los correos de Aplica cambio de medico.
// Es el unico nodo Code del sistema que devuelve varios items.
// ------------------------------------------------------------
// arma un item por cada paciente que debe recibir aviso: uno por cita
// reasignada y uno por cita cancelada. si el medico no tenia citas,
// devuelve una lista vacia y Envia correo no se ejecuta; la respuesta
// al admin sale por la otra rama y no depende de esta.
const r = $input.first().json;

function leer(valor) {
  if (!valor) return [];
  return typeof valor === 'string' ? JSON.parse(valor) : valor;
}

const correos = [];

for (const c of leer(r.detalle_reasignadas)) {
  correos.push({
    json: {
      para: c.correo,
      asunto: 'SIGAC - Cambio de medico en su cita del ' + c.fecha,
      texto:
        'Estimado(a) ' + c.paciente + ':\n\n' +
        'Le informamos que su cita del ' + c.fecha + ' a las ' + c.hora +
        ' sigue en pie, pero sera atendida por ' + c.medico_nuevo +
        ' (' + c.especialidad + '), porque el medico asignado anteriormente ya no esta disponible.\n\n' +
        'No necesita hacer nada: la fecha y la hora se mantienen.\n\n' +
        'Clinica - SIGAC'
    }
  });
}

for (const c of leer(r.detalle_canceladas)) {
  correos.push({
    json: {
      para: c.correo,
      asunto: 'SIGAC - Su cita del ' + c.fecha + ' no esta disponible',
      texto:
        'Estimado(a) ' + c.paciente + ':\n\n' +
        'Lamentamos informarle que la cita que tenia programada para el ' + c.fecha +
        ' a las ' + c.hora + ' ya no esta disponible, porque el medico asignado no podra atenderla ' +
        'y no encontramos otro medico libre en ese horario.\n\n' +
        'Por favor, llame a la clinica para recibir mas informacion y reprogramar su cita.\n\n' +
        'Clinica - SIGAC'
    }
  });
}

return correos;
