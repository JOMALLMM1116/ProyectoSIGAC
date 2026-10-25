// sigac.wf09.medicodesactivado.test.js
//
// pruebas unitarias del nodo Medico desactivado de WF-09. arma la
// respuesta 200 con el resumen de lo que paso con las citas del medico:
// reasignadas, canceladas, preferencias liberadas y tokens desactivados.
// los conteos llegan como texto desde postgres.
//
// cada prueba lleva su ID de la tabla de pruebas: UT-MDE09-NN

'use strict';

const medicoDesactivado = require('../nodos/wf09_medico_desactivado.js');
const { ejecutar } = require('../simulacion.js');

const APLICADO = {
  dado_de_baja: false, reasignadas: '7', canceladas: '0', preferencias_liberadas: '0',
  tokens_desactivados: '1', hash_auditoria: 'abc',
  detalle_reasignadas: [{ correo: 'a@correo.com', paciente: 'Ana Test' }], detalle_canceladas: []
};

const responder = (aplicado = APLICADO, id = 2) =>
  ejecutar(medicoDesactivado, { entrada: [aplicado], anteriores: { 'Valida datos': { id } } });
const salidaDe = (aplicado, id) => responder(aplicado, id).salida[0].json;

describe('WF-09 · Medico desactivado', () => {
  test('UT-MDE09-01 · desactivacion: respuesta completa', () => {
    expect(salidaDe()).toEqual({
      codigo: 200,
      estado: 'actualizado',
      mensaje: 'Medico 2 desactivado',
      citas_reasignadas: 7,
      citas_canceladas: 0,
      preferencias_liberadas: 0,
      tokens_desactivados: 1,
      hash_auditoria: 'abc'
    });
  });

  test('UT-MDE09-02 · baja: el mensaje dice dado de baja', () => {
    expect(salidaDe({ ...APLICADO, dado_de_baja: true }, 6).mensaje).toBe('Medico 6 dado de baja');
  });

  test('UT-MDE09-03 · los cuatro conteos llegan como texto: salen como numero', () => {
    const salida = salidaDe({ ...APLICADO, reasignadas: '7', canceladas: '1', preferencias_liberadas: '1', tokens_desactivados: '1' });
    expect([salida.citas_reasignadas, salida.citas_canceladas, salida.preferencias_liberadas, salida.tokens_desactivados]).toEqual([7, 1, 1, 1]);
  });

  test('UT-MDE09-04 · medico sin citas: todo en cero', () => {
    const salida = salidaDe({ ...APLICADO, reasignadas: '0', canceladas: '0', tokens_desactivados: '0' });
    expect([salida.citas_reasignadas, salida.citas_canceladas, salida.tokens_desactivados]).toEqual([0, 0, 0]);
  });

  test('UT-MDE09-05 · no devuelve el detalle de los pacientes: ese va a los correos', () => {
    const texto = JSON.stringify(responder().salida);
    expect(texto).not.toContain('a@correo.com');
    expect(texto).not.toContain('Ana Test');
  });

  test('UT-MDE09-06 · consulta Valida datos (verify)', () => {
    expect(responder().$).toHaveBeenCalledWith('Valida datos');
  });

  test('UT-MDE09-07 · devuelve una lista con un solo item de ocho campos', () => {
    const { salida } = responder();
    expect(salida).toHaveLength(1);
    expect(Object.keys(salida[0].json)).toHaveLength(8);
  });
});
