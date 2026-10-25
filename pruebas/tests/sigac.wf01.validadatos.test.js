// sigac.wf01.validadatos.test.js
//
// pruebas unitarias del nodo Valida datos de WF-01. es el nodo con
// mas reglas del sistema: 31 ramas. la matriz agrupa los casos por
// regla, de la A a la N.
//
// el reloj se fija en el 23 de octubre de 2026 a mediodia en Guatemala,
// para que "ayer", "hoy" y "manana" no cambien con el tiempo.
//
// el catalogo simulado de medicos activos es:
//   1 Medicina General · 2 Pediatria · 5 Ginecologia
//
// cada prueba lleva su ID de la tabla de pruebas: UT-VAL01-NN

'use strict';

const validaDatos = require('../nodos/wf01_valida_datos.js');
const { ejecutar } = require('../simulacion.js');

const CATALOGO = [
  { id: 1, especialidad: 'Medicina General' },
  { id: 2, especialidad: 'Pediatria' },
  { id: 5, especialidad: 'Ginecologia' }
];

// una solicitud que cumple todas las reglas. cada prueba cambia
// solo el campo que quiere verificar
const valida = () => ({
  dpi: '1234567890123',
  nombre: 'Ana',
  apellido: 'Coc',
  telefono: '55551234',
  correo: 'ana@correo.com',
  fecha_nacimiento: '1990-05-10',
  tipo_consulta: 'general',
  motivo: 'control',
  fecha_preferida: '2026-10-24'
});

// ejecuta el nodo con los datos y el catalogo indicados
function validar(datos, medicos = CATALOGO, hash = { datos }) {
  return ejecutar(validaDatos, {
    anteriores: {
      'Hash del token': hash,
      'Lee medicos activos': { medicos },
      'Verifica token': { rol: 'recepcion' }
    }
  });
}

// atajo: solo la salida del nodo
const salidaDe = (cambios, medicos) => validar({ ...valida(), ...cambios }, medicos).salida[0].json;

beforeAll(() => jest.useFakeTimers({ now: new Date('2026-10-23T18:00:00Z') }));
afterAll(() => jest.useRealTimers());

// ------------------------------------------------------------
// A. DPI
// ------------------------------------------------------------
describe('WF-01 · Valida datos · A. DPI', () => {
  test.each([
    ['UT-VAL01-01', '12 digitos', '123456789012', false],
    ['UT-VAL01-02', '13 digitos', '1234567890123', true],
    ['UT-VAL01-03', '14 digitos', '12345678901234', false],
    ['UT-VAL01-04', 'con una letra', '123456789012A', false]
  ])('%s · DPI de %s', (_, __, dpi, esperado) => {
    expect(salidaDe({ dpi }).valido).toBe(esperado);
  });

  test('UT-VAL01-05 · sin DPI: error', () => {
    const datos = valida();
    delete datos.dpi;
    expect(validar(datos).salida[0].json.errores).toContain('El DPI debe tener exactamente 13 digitos');
  });

  test('UT-VAL01-06 · DPI con espacios: valido y sale recortado (defecto 12.11)', () => {
    const salida = salidaDe({ dpi: ' 1234567890123 ' });
    expect(salida.valido).toBe(true);
    expect(salida.datos.dpi).toBe('1234567890123');
  });

  test('UT-VAL01-07 · el DPI se enmascara dejando los ultimos 4 digitos', () => {
    expect(salidaDe({}).dpi_enmascarado).toBe('*********0123');
  });

  test('UT-VAL01-08 · un DPI de menos de 4 caracteres se enmascara completo', () => {
    expect(salidaDe({ dpi: '12' }).dpi_enmascarado).toBe('****');
  });
});

// ------------------------------------------------------------
// B. Telefono (opcional)
// ------------------------------------------------------------
describe('WF-01 · Valida datos · B. Telefono', () => {
  test('UT-VAL01-09 · sin telefono: valido, porque es opcional', () => {
    const datos = valida();
    delete datos.telefono;
    expect(validar(datos).salida[0].json.valido).toBe(true);
  });

  test.each([
    ['UT-VAL01-10', 'empieza en 1', '12345678', false],
    ['UT-VAL01-11', 'empieza en 2', '22345678', true],
    ['UT-VAL01-12', 'empieza en 8', '82345678', true],
    ['UT-VAL01-13', 'empieza en 9', '92345678', false],
    ['UT-VAL01-14', 'tiene 7 digitos', '5555123', false],
    ['UT-VAL01-15', 'tiene 9 digitos', '555512345', false]
  ])('%s · telefono que %s', (_, __, telefono, esperado) => {
    expect(salidaDe({ telefono }).valido).toBe(esperado);
  });

  test('UT-VAL01-16 · telefono con espacios: valido y sale recortado', () => {
    const salida = salidaDe({ telefono: ' 55551234 ' });
    expect(salida.valido).toBe(true);
    expect(salida.datos.telefono).toBe('55551234');
  });
});

// ------------------------------------------------------------
// C. Correo
// ------------------------------------------------------------
describe('WF-01 · Valida datos · C. Correo', () => {
  test.each([
    ['UT-VAL01-17', 'valido', 'ana@correo.com', true],
    ['UT-VAL01-18', 'sin arroba', 'ana.correo.com', false],
    ['UT-VAL01-19', 'sin punto en el dominio', 'ana@correo', false],
    ['UT-VAL01-20', 'con un espacio', 'ana @correo.com', false]
  ])('%s · correo %s', (_, __, correo, esperado) => {
    expect(salidaDe({ correo }).valido).toBe(esperado);
  });

  test('UT-VAL01-21 · sin correo: error', () => {
    const datos = valida();
    delete datos.correo;
    expect(validar(datos).salida[0].json.errores).toContain('El correo no tiene un formato valido');
  });
});

// ------------------------------------------------------------
// D. Fecha preferida
// ------------------------------------------------------------
describe('WF-01 · Valida datos · D. Fecha preferida', () => {
  test('UT-VAL01-22 · ayer: error de fecha en el pasado', () => {
    expect(salidaDe({ fecha_preferida: '2026-10-22' }).errores)
      .toContain('La fecha preferida no puede estar en el pasado');
  });

  test.each([
    ['UT-VAL01-23', 'hoy', '2026-10-23'],
    ['UT-VAL01-24', 'manana', '2026-10-24']
  ])('%s · %s: valido', (_, __, fecha_preferida) => {
    expect(salidaDe({ fecha_preferida }).valido).toBe(true);
  });

  test.each([
    ['UT-VAL01-25', '30 de febrero (defecto 12.14)', '2027-02-30'],
    ['UT-VAL01-26', 'en formato dd/mm/aaaa', '24/10/2026']
  ])('%s · %s: fecha invalida', (_, __, fecha_preferida) => {
    expect(salidaDe({ fecha_preferida }).errores).toContain('La fecha preferida no es una fecha valida');
  });

  test('UT-VAL01-27 · sin fecha preferida: fecha invalida', () => {
    const datos = valida();
    delete datos.fecha_preferida;
    expect(validar(datos).salida[0].json.errores).toContain('La fecha preferida no es una fecha valida');
  });
});

// ------------------------------------------------------------
// E. Tipo de consulta
// ------------------------------------------------------------
describe('WF-01 · Valida datos · E. Tipo de consulta', () => {
  test.each(['urgencia', 'control', 'general'])('UT-VAL01-28 · %s: valido', tipo_consulta => {
    expect(salidaDe({ tipo_consulta }).valido).toBe(true);
  });

  test('UT-VAL01-29 · un tipo que no existe: error', () => {
    expect(salidaDe({ tipo_consulta: 'revision' }).errores)
      .toContain('El tipo de consulta debe ser urgencia, control o general');
  });

  test('UT-VAL01-30 · General con mayuscula: error, la lista es exacta', () => {
    expect(salidaDe({ tipo_consulta: 'General' }).valido).toBe(false);
  });
});

// ------------------------------------------------------------
// F. Campos obligatorios
// ------------------------------------------------------------
describe('WF-01 · Valida datos · F. Campos obligatorios', () => {
  test.each(['nombre', 'apellido', 'fecha_nacimiento'])('UT-VAL01-31 · sin %s: error', campo => {
    const datos = valida();
    delete datos[campo];
    expect(validar(datos).salida[0].json.errores).toContain('Falta el campo ' + campo);
  });

  test('UT-VAL01-32 · nombre con solo espacios: cuenta como ausente', () => {
    expect(salidaDe({ nombre: '   ' }).errores).toContain('Falta el campo nombre');
  });

  test('UT-VAL01-33 · nombre y apellido con espacios: salen recortados', () => {
    const salida = salidaDe({ nombre: '  Ana  ', apellido: ' Coc ' });
    expect(salida.valido).toBe(true);
    expect(salida.datos.nombre).toBe('Ana');
    expect(salida.datos.apellido).toBe('Coc');
  });
});

// ------------------------------------------------------------
// G. Fecha de nacimiento
// ------------------------------------------------------------
describe('WF-01 · Valida datos · G. Fecha de nacimiento', () => {
  const FORMATO = 'La fecha de nacimiento debe ser una fecha valida con formato AAAA-MM-DD';

  test.each([
    ['UT-VAL01-34', 'texto (defecto 12.14)', 'abc'],
    ['UT-VAL01-35', '30 de febrero', '1990-02-30']
  ])('%s · %s: error de formato', (_, __, fecha_nacimiento) => {
    expect(salidaDe({ fecha_nacimiento }).errores).toContain(FORMATO);
  });

  test('UT-VAL01-36 · manana: error, no puede ser futura', () => {
    expect(salidaDe({ fecha_nacimiento: '2026-10-24' }).errores)
      .toContain('La fecha de nacimiento no puede estar en el futuro');
  });

  test('UT-VAL01-37 · hoy: valido', () => {
    expect(salidaDe({ fecha_nacimiento: '2026-10-23' }).valido).toBe(true);
  });

  test('UT-VAL01-38 · 31/12/1899: error, anterior a 1900', () => {
    expect(salidaDe({ fecha_nacimiento: '1899-12-31' }).errores)
      .toContain('La fecha de nacimiento no puede ser anterior a 1900');
  });

  test('UT-VAL01-39 · 01/01/1900: valido', () => {
    expect(salidaDe({ fecha_nacimiento: '1900-01-01' }).valido).toBe(true);
  });

  test('UT-VAL01-40 · vacia: solo el error de campo faltante, sin el de formato', () => {
    const errores = salidaDe({ fecha_nacimiento: '' }).errores;
    expect(errores).toContain('Falta el campo fecha_nacimiento');
    expect(errores).not.toContain(FORMATO);
  });
});

// ------------------------------------------------------------
// H. Motivo
// ------------------------------------------------------------
describe('WF-01 · Valida datos · H. Motivo', () => {
  test('UT-VAL01-41 · sin motivo: valido', () => {
    const datos = valida();
    delete datos.motivo;
    expect(validar(datos).salida[0].json.valido).toBe(true);
  });

  test.each([
    ['UT-VAL01-42', 255, true],
    ['UT-VAL01-43', 256, false]
  ])('%s · motivo de %i caracteres', (_, largo, esperado) => {
    expect(salidaDe({ motivo: 'x'.repeat(largo) }).valido).toBe(esperado);
  });
});

// ------------------------------------------------------------
// I. Franja y hora
// ------------------------------------------------------------
describe('WF-01 · Valida datos · I. Franja y hora', () => {
  test('UT-VAL01-44 · sin franja: queda indiferente', () => {
    expect(salidaDe({}).franja_preferida).toBe('indiferente');
  });

  test.each(['manana', 'tarde', 'indiferente'])('UT-VAL01-45 · franja %s: valida', franja_preferida => {
    expect(salidaDe({ franja_preferida }).valido).toBe(true);
  });

  test('UT-VAL01-46 · franja que no existe: error', () => {
    expect(salidaDe({ franja_preferida: 'noche' }).errores)
      .toContain('La franja debe ser manana, tarde o indiferente');
  });

  test('UT-VAL01-47 · franja con espacios: valida y recortada', () => {
    const salida = salidaDe({ franja_preferida: ' tarde ' });
    expect(salida.valido).toBe(true);
    expect(salida.franja_preferida).toBe('tarde');
  });

  test('UT-VAL01-48 · sin hora: hora_solicitada queda nula', () => {
    expect(salidaDe({}).hora_solicitada).toBeNull();
  });

  test.each([
    ['07:59', false], ['08:00', true], ['11:59', true], ['12:00', false]
  ])('UT-VAL01-49 · limite de la manana: %s', (hora_solicitada, esperado) => {
    expect(salidaDe({ hora_solicitada }).valido).toBe(esperado);
  });

  test.each([
    ['13:29', false], ['13:30', true], ['16:59', true], ['17:00', false]
  ])('UT-VAL01-50 · limite de la tarde: %s', (hora_solicitada, esperado) => {
    expect(salidaDe({ hora_solicitada }).valido).toBe(esperado);
  });

  test('UT-VAL01-51 · hora del almuerzo (12:45): error', () => {
    expect(salidaDe({ hora_solicitada: '12:45' }).errores)
      .toContain('La hora solicitada debe estar entre 08:00 y 12:00 o entre 13:30 y 17:00');
  });

  test.each(['8:00', '24:00', '08:60', 'ocho'])('UT-VAL01-52 · formato invalido: %s', hora_solicitada => {
    expect(salidaDe({ hora_solicitada }).errores).toContain('La hora solicitada debe tener el formato HH:MM');
  });

  test('UT-VAL01-53 · franja tarde con 09:00: error', () => {
    expect(salidaDe({ franja_preferida: 'tarde', hora_solicitada: '09:00' }).errores)
      .toContain('La hora solicitada no corresponde a la franja de la tarde');
  });

  test('UT-VAL01-54 · franja manana con 15:00: error', () => {
    expect(salidaDe({ franja_preferida: 'manana', hora_solicitada: '15:00' }).errores)
      .toContain('La hora solicitada no corresponde a la franja de la manana');
  });

  test('UT-VAL01-55 · franja indiferente con 15:00: valido', () => {
    expect(salidaDe({ franja_preferida: 'indiferente', hora_solicitada: '15:00' }).valido).toBe(true);
  });
});

// ------------------------------------------------------------
// J. Especialidad (defecto 12.20)
// ------------------------------------------------------------
describe('WF-01 · Valida datos · J. Especialidad', () => {
  test('UT-VAL01-56 · sin especialidad: queda nula', () => {
    expect(salidaDe({}).especialidad_solicitada).toBeNull();
  });

  test('UT-VAL01-57 · especialidad con solo espacios: nula y sin error', () => {
    const salida = salidaDe({ especialidad_solicitada: '   ' });
    expect(salida.valido).toBe(true);
    expect(salida.especialidad_solicitada).toBeNull();
  });

  test('UT-VAL01-58 · pediatría en minusculas y con tilde: se normaliza a Pediatria', () => {
    const salida = salidaDe({ especialidad_solicitada: 'pediatría' });
    expect(salida.valido).toBe(true);
    expect(salida.especialidad_solicitada).toBe('Pediatria');
  });

  test('UT-VAL01-59 · especialidad sin medicos activos: error y queda nula', () => {
    const salida = salidaDe({ especialidad_solicitada: 'Cardiologia' });
    expect(salida.errores).toContain('No hay medicos activos con la especialidad Cardiologia');
    expect(salida.especialidad_solicitada).toBeNull();
  });
});

// ------------------------------------------------------------
// K. Medico solicitado (defectos 12.18 y 12.19)
// ------------------------------------------------------------
describe('WF-01 · Valida datos · K. Medico solicitado', () => {
  test.each([
    ['ausente', undefined],
    ['nulo', null],
    ['texto vacio', '']
  ])('UT-VAL01-60 · medico %s: queda nulo, sin error', (_, id_medico_solicitado) => {
    const salida = salidaDe({ id_medico_solicitado });
    expect(salida.valido).toBe(true);
    expect(salida.id_medico_solicitado).toBeNull();
  });

  test('UT-VAL01-61 · medico 2 como numero: valido', () => {
    expect(salidaDe({ id_medico_solicitado: 2 }).id_medico_solicitado).toBe(2);
  });

  test('UT-VAL01-62 · medico "2" como texto: valido y convertido a numero', () => {
    const salida = salidaDe({ id_medico_solicitado: '2' });
    expect(salida.valido).toBe(true);
    expect(salida.id_medico_solicitado).toBe(2);
  });

  test.each([0, -1])('UT-VAL01-63 · medico %p: identificador invalido', id_medico_solicitado => {
    expect(salidaDe({ id_medico_solicitado }).errores)
      .toContain('El medico solicitado debe ser un identificador valido');
  });

  test.each([2.5, 'abc'])('UT-VAL01-64 · medico %p: identificador invalido', id_medico_solicitado => {
    expect(salidaDe({ id_medico_solicitado }).errores)
      .toContain('El medico solicitado debe ser un identificador valido');
  });

  test('UT-VAL01-65 · medico 99, que no esta en el catalogo: error', () => {
    expect(salidaDe({ id_medico_solicitado: 99 }).errores)
      .toContain('El medico solicitado no existe o no esta activo');
  });

  // hipotesis A: Number(true) es 1, asi que true podria colarse como
  // el medico 1. un medico se pide con su numero, nunca con true.
  test('UT-VAL01-66 · medico true: debe rechazarse (hipotesis A)', () => {
    expect(salidaDe({ id_medico_solicitado: true }).valido).toBe(false);
  });
});

// ------------------------------------------------------------
// L. Combinacion medico y especialidad
// ------------------------------------------------------------
describe('WF-01 · Valida datos · L. Combinacion medico y especialidad', () => {
  test('UT-VAL01-67 · medico 2 con Pediatria: valido', () => {
    expect(salidaDe({ id_medico_solicitado: 2, especialidad_solicitada: 'Pediatria' }).valido).toBe(true);
  });

  test('UT-VAL01-68 · medico 2 con Ginecologia: error', () => {
    expect(salidaDe({ id_medico_solicitado: 2, especialidad_solicitada: 'Ginecologia' }).errores)
      .toContain('El medico solicitado no pertenece a la especialidad Ginecologia');
  });
});

// ------------------------------------------------------------
// M. Catalogo de medicos
// ------------------------------------------------------------
describe('WF-01 · Valida datos · M. Catalogo de medicos', () => {
  test('UT-VAL01-69 · catalogo como texto json: funciona igual que como arreglo', () => {
    const salida = salidaDe({ id_medico_solicitado: 5 }, JSON.stringify(CATALOGO));
    expect(salida.valido).toBe(true);
    expect(salida.id_medico_solicitado).toBe(5);
  });

  test('UT-VAL01-70 · catalogo nulo: cualquier medico o especialidad pedidos dan error', () => {
    expect(salidaDe({ id_medico_solicitado: 1 }, null).errores)
      .toContain('El medico solicitado no existe o no esta activo');
    expect(salidaDe({ especialidad_solicitada: 'Pediatria' }, null).errores)
      .toContain('No hay medicos activos con la especialidad Pediatria');
  });
});

// ------------------------------------------------------------
// N. Conjunto y contrato de salida
// ------------------------------------------------------------
describe('WF-01 · Valida datos · N. Conjunto y contrato', () => {
  const ERRORES_CUERPO_VACIO = [
    'El DPI debe tener exactamente 13 digitos',
    'El correo no tiene un formato valido',
    'La fecha preferida no es una fecha valida',
    'El tipo de consulta debe ser urgencia, control o general',
    'Falta el campo nombre',
    'Falta el campo apellido',
    'Falta el campo fecha_nacimiento'
  ];

  test('UT-VAL01-71 · cuerpo vacio: todos los errores juntos en una sola respuesta', () => {
    const salida = validar({}).salida[0].json;
    expect(salida.valido).toBe(false);
    expect(salida.errores).toEqual(ERRORES_CUERPO_VACIO);
  });

  test('UT-VAL01-72 · Hash del token sin datos: no falla y valida como cuerpo vacio', () => {
    const salida = validar(undefined, CATALOGO, {}).salida[0].json;
    expect(salida.errores).toEqual(ERRORES_CUERPO_VACIO);
  });

  test('UT-VAL01-73 · solicitud valida: devuelve un item con los nueve campos', () => {
    const { salida } = validar(valida());
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual([
      'datos', 'dpi_enmascarado', 'errores', 'especialidad_solicitada', 'franja_preferida',
      'hora_solicitada', 'id_medico_solicitado', 'rol', 'valido'
    ]);
  });

  test('UT-VAL01-74 · el rol sale de Verifica token', () => {
    expect(salidaDe({}).rol).toBe('recepcion');
  });

  test('UT-VAL01-75 · consulta los tres nodos anteriores (verify)', () => {
    const { $ } = validar(valida());
    expect($).toHaveBeenCalledWith('Hash del token');
    expect($).toHaveBeenCalledWith('Lee medicos activos');
    expect($).toHaveBeenCalledWith('Verifica token');
  });

  test('UT-VAL01-76 · un campo no previsto se conserva en datos', () => {
    expect(salidaDe({ campo_extra: 'x' }).datos.campo_extra).toBe('x');
  });
});
