// sigac.wf09.validadatos.test.js
//
// pruebas unitarias del nodo Valida datos de WF-09. valida la peticion de
// administracion: accion, entidad y los campos de cada combinacion, y
// calcula la ruta que tomara el Switch. los errores se acumulan.
//
//   agregar     medico, recepcionista              nombre (+ especialidad y colegiado)
//   desactivar  paciente, medico, recepcionista    id
//   dar_baja    paciente, medico, recepcionista    id
//   reactivar   paciente, medico, recepcionista    id
//
// cada prueba lleva su ID de la tabla de pruebas: UT-VAL09-NN

'use strict';

const validaDatos = require('../nodos/wf09_valida_datos.js');
const { ejecutar } = require('../simulacion.js');

function validar(cuerpo, hash = { datos: cuerpo }) {
  return ejecutar(validaDatos, {
    anteriores: { 'Hash del token': hash, 'Verifica token': { rol: 'admin' } }
  });
}

const salidaDe = cuerpo => validar(cuerpo).salida[0].json;

const MEDICO = { accion: 'agregar', entidad: 'medico', nombre: 'Caal Tiul, Jorge Luis', especialidad: 'Pediatria', colegiado: 'COL-90001' };

// ------------------------------------------------------------
// A. Accion y entidad
// ------------------------------------------------------------
describe('WF-09 · Valida datos · A. Accion y entidad', () => {
  test('UT-VAL09-01 · accion inexistente: error', () => {
    expect(salidaDe({ accion: 'borrar', entidad: 'medico', id: 1 }).errores)
      .toContain('La accion debe ser agregar, desactivar, dar_baja o reactivar');
  });

  test('UT-VAL09-02 · entidad inexistente: error', () => {
    expect(salidaDe({ accion: 'desactivar', entidad: 'admin', id: 1 }).errores)
      .toContain('La entidad debe ser paciente, medico o recepcionista');
  });

  test('UT-VAL09-03 · cuerpo vacio: los dos errores juntos', () => {
    expect(salidaDe({}).errores).toEqual([
      'La accion debe ser agregar, desactivar, dar_baja o reactivar',
      'La entidad debe ser paciente, medico o recepcionista'
    ]);
  });

  test('UT-VAL09-04 · accion y entidad en mayusculas y con espacios: se aceptan', () => {
    const salida = salidaDe({ accion: ' Desactivar ', entidad: ' MEDICO ', id: 2 });
    expect(salida.valido).toBe(true);
    expect(salida.accion).toBe('desactivar');
    expect(salida.entidad).toBe('medico');
  });
});

// ------------------------------------------------------------
// B. Rutas del Switch
// ------------------------------------------------------------
describe('WF-09 · Valida datos · B. Rutas', () => {
  test.each([
    ['agregar', 'recepcionista', { nombre: 'Rosa' }, 'recepcionista_agregar'],
    ['desactivar', 'recepcionista', { id: 1 }, 'recepcionista_estado'],
    ['dar_baja', 'recepcionista', { id: 1 }, 'recepcionista_estado'],
    ['reactivar', 'recepcionista', { id: 1 }, 'recepcionista_reactivar'],
    ['desactivar', 'paciente', { id: 1 }, 'paciente_estado'],
    ['dar_baja', 'paciente', { id: 1 }, 'paciente_estado'],
    ['reactivar', 'paciente', { id: 1 }, 'paciente_reactivar'],
    ['agregar', 'medico', { nombre: 'X', especialidad: 'Pediatria', colegiado: 'COL-1' }, 'medico_agregar'],
    ['desactivar', 'medico', { id: 1 }, 'medico_estado'],
    ['dar_baja', 'medico', { id: 1 }, 'medico_estado'],
    ['reactivar', 'medico', { id: 1 }, 'medico_reactivar']
  ])('UT-VAL09-05 · %s %s: ruta correcta', (accion, entidad, campos, ruta) => {
    expect(salidaDe({ accion, entidad, ...campos }).ruta).toBe(ruta);
  });

  test('UT-VAL09-06 · con errores, la ruta queda nula', () => {
    expect(salidaDe({ accion: 'desactivar', entidad: 'medico', id: 'abc' }).ruta).toBeNull();
  });

  test.each([
    ['UT-VAL09-07', 'dar_baja', true],
    ['UT-VAL09-08', 'desactivar', false],
    ['UT-VAL09-09', 'reactivar', false]
  ])('%s · %s: bandera baja %p', (_, accion, baja) => {
    expect(salidaDe({ accion, entidad: 'paciente', id: 1 }).baja).toBe(baja);
  });
});

// ------------------------------------------------------------
// C. Agregar
// ------------------------------------------------------------
describe('WF-09 · Valida datos · C. Agregar', () => {
  test('UT-VAL09-10 · agregar paciente: error, nacen en WF-01', () => {
    expect(salidaDe({ accion: 'agregar', entidad: 'paciente', nombre: 'Ana' }).errores)
      .toContain('Los pacientes se registran con su primera solicitud de cita, no desde administracion');
  });

  test('UT-VAL09-11 · medico completo: valido, con coma en el nombre', () => {
    const salida = salidaDe(MEDICO);
    expect(salida.valido).toBe(true);
    expect(salida.nombre).toBe('Caal Tiul, Jorge Luis');
  });

  test.each([
    ['UT-VAL09-12', 'nombre', 'Falta el campo nombre'],
    ['UT-VAL09-13', 'especialidad', 'Falta el campo especialidad'],
    ['UT-VAL09-14', 'colegiado', 'Falta el campo colegiado']
  ])('%s · medico sin %s: error', (_, campo, mensaje) => {
    const cuerpo = { ...MEDICO };
    delete cuerpo[campo];
    expect(salidaDe(cuerpo).errores).toContain(mensaje);
  });

  test('UT-VAL09-15 · recepcionista solo necesita nombre', () => {
    expect(salidaDe({ accion: 'agregar', entidad: 'recepcionista', nombre: 'Rosa' }).valido).toBe(true);
  });

  test.each([
    ['UT-VAL09-16', 120, true],
    ['UT-VAL09-17', 121, false]
  ])('%s · nombre de %i caracteres', (_, largo, esperado) => {
    expect(salidaDe({ ...MEDICO, nombre: 'x'.repeat(largo) }).valido).toBe(esperado);
  });

  test.each([
    ['UT-VAL09-18', 60, true],
    ['UT-VAL09-19', 61, false]
  ])('%s · especialidad de %i caracteres', (_, largo, esperado) => {
    expect(salidaDe({ ...MEDICO, especialidad: 'x'.repeat(largo) }).valido).toBe(esperado);
  });

  test.each([
    ['UT-VAL09-20', 'COL-90001', true],
    ['UT-VAL09-21', 'x'.repeat(20), true],
    ['UT-VAL09-22', 'x'.repeat(21), false],
    ['UT-VAL09-23', 'COL 90001', false],
    ['UT-VAL09-24', 'COL_90001', false]
  ])('%s · colegiado %s', (_, colegiado, esperado) => {
    expect(salidaDe({ ...MEDICO, colegiado }).valido).toBe(esperado);
  });

  test('UT-VAL09-25 · nombre, especialidad y colegiado salen recortados', () => {
    const salida = salidaDe({ ...MEDICO, nombre: '  Jorge  ', especialidad: ' Pediatria ', colegiado: ' COL-1 ' });
    expect([salida.nombre, salida.especialidad, salida.colegiado]).toEqual(['Jorge', 'Pediatria', 'COL-1']);
  });

  test('UT-VAL09-26 · agregar no necesita id: queda nulo', () => {
    expect(salidaDe(MEDICO).id).toBeNull();
  });
});

// ------------------------------------------------------------
// D. id para desactivar, dar_baja y reactivar
// ------------------------------------------------------------
describe('WF-09 · Valida datos · D. id', () => {
  test.each([
    ['UT-VAL09-27', 'numero', 6, 6],
    ['UT-VAL09-28', 'texto numerico', '6', 6]
  ])('%s · id como %s: valido', (_, __, id, esperado) => {
    expect(salidaDe({ accion: 'desactivar', entidad: 'medico', id }).id).toBe(esperado);
  });

  test.each([
    ['UT-VAL09-29', 'cero', 0],
    ['UT-VAL09-30', 'negativo', -1],
    ['UT-VAL09-31', 'decimal', 2.5],
    ['UT-VAL09-32', 'texto', 'abc'],
    ['UT-VAL09-33', 'ausente', undefined]
  ])('%s · id %s: error', (_, __, id) => {
    expect(salidaDe({ accion: 'desactivar', entidad: 'medico', id }).errores).toContain('El id debe ser un entero positivo');
  });

  // hipotesis A: Number(true) es 1, asi que true desactivaria a la persona 1
  test('UT-VAL09-34 · id true: debe rechazarse (hipotesis A)', () => {
    expect(salidaDe({ accion: 'dar_baja', entidad: 'medico', id: true }).valido).toBe(false);
  });

  test('UT-VAL09-35 · desactivar ignora nombre, especialidad y colegiado', () => {
    const salida = salidaDe({ accion: 'desactivar', entidad: 'medico', id: 2, nombre: 'X', colegiado: 'COL-1' });
    expect([salida.nombre, salida.especialidad, salida.colegiado]).toEqual([null, null, null]);
  });
});

// ------------------------------------------------------------
// E. Contrato
// ------------------------------------------------------------
describe('WF-09 · Valida datos · E. Contrato', () => {
  test('UT-VAL09-36 · el rol sale de Verifica token', () => {
    expect(salidaDe(MEDICO).rol).toBe('admin');
  });

  test('UT-VAL09-37 · Hash del token sin datos: no falla', () => {
    expect(validar(undefined, {}).salida[0].json.valido).toBe(false);
  });

  test('UT-VAL09-38 · consulta Hash del token y Verifica token (verify)', () => {
    const { $ } = validar(MEDICO);
    expect($).toHaveBeenCalledWith('Hash del token');
    expect($).toHaveBeenCalledWith('Verifica token');
  });

  test('UT-VAL09-39 · devuelve un item con los once campos', () => {
    const { salida } = validar(MEDICO);
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json).sort()).toEqual([
      'accion', 'baja', 'colegiado', 'entidad', 'errores', 'especialidad', 'id', 'nombre', 'rol', 'ruta', 'valido'
    ]);
  });
});
