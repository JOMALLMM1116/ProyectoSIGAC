// personas.js — SIGAC, pantalla de administración
// Lista médicos, recepcionistas y pacientes (WF-10 «personas») y aplica
// las operaciones de WF-09: agregar, desactivar, dar de baja y reactivar.
// El token de una persona nueva o reactivada se muestra una sola vez.

(() => {
  const persona = PAGINA.iniciar('admin');
  if (!persona) {
    return;
  }

  const mensaje = document.getElementById('mensaje');
  let datos = { medicos: [], recepcionistas: [], pacientes: [] };

  // --- Pestañas ---

  const pestanas = document.querySelectorAll('.pestana');
  const secciones = {
    medicos: document.getElementById('seccion-medicos'),
    recepcionistas: document.getElementById('seccion-recepcionistas'),
    pacientes: document.getElementById('seccion-pacientes')
  };

  pestanas.forEach(p => p.addEventListener('click', () => {
    pestanas.forEach(q => q.setAttribute('aria-selected', String(q === p)));
    Object.entries(secciones).forEach(([clave, seccion]) => {
      seccion.classList.toggle('oculto', clave !== p.dataset.seccion);
    });
  }));

  // --- Caja del token: se muestra una sola vez ---

  const cajaToken = document.getElementById('caja-token');
  const tokenPara = document.getElementById('token-para');
  const tokenValor = document.getElementById('token-valor');

  function mostrarToken(nombre, token) {
    tokenPara.textContent = nombre;
    tokenValor.textContent = token;
    cajaToken.classList.remove('oculto');
    window.scrollTo(0, 0);
  }

  function ocultarToken() {
    tokenValor.textContent = '';
    tokenPara.textContent = '';
    cajaToken.classList.add('oculto');
  }

  document.getElementById('boton-copiar-token').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(tokenValor.textContent);
      PAGINA.mostrarMensaje(mensaje, 'exito', 'Token copiado. Pégalo donde la persona lo vaya a recibir y pulsa «Ya lo entregué».');
    } catch {
      PAGINA.mostrarMensaje(mensaje, 'aviso', 'No se pudo copiar automáticamente. Selecciona el token y cópialo a mano.');
    }
  });

  document.getElementById('boton-ocultar-token').addEventListener('click', ocultarToken);

  // --- Carga y tablas ---

  async function cargar() {
    const respuesta = await API.llamar('consulta', { consulta: 'personas' });
    if (respuesta.codigo !== 200) {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      return;
    }
    datos = {
      medicos: respuesta.medicos || [],
      recepcionistas: respuesta.recepcionistas || [],
      pacientes: respuesta.pacientes || []
    };
    pintarMedicos();
    pintarRecepcionistas();
    pintarPacientes();
    llenarEspecialidades();
  }

  function celdaAcciones(entidad, p) {
    const celda = document.createElement('td');
    const grupo = PAGINA.crear('div', 'grupo-botones');

    function boton(texto, clase, icono, accion) {
      const b = PAGINA.boton(texto, 'boton boton-pequeno ' + clase, icono);
      b.addEventListener('click', () => ejecutar(accion, entidad, p));
      grupo.appendChild(b);
    }

    if (p.estado === 'activo') {
      boton('Desactivar', 'boton-aviso', 'block', 'desactivar');
      boton('Dar de baja', 'boton-peligro', 'delete_forever', 'dar_baja');
    } else if (p.estado === 'inactivo') {
      boton('Reactivar', '', 'replay', 'reactivar');
      boton('Dar de baja', 'boton-peligro', 'delete_forever', 'dar_baja');
    }

    celda.appendChild(grupo);
    return celda;
  }

  function celdaEstado(valor) {
    const celda = document.createElement('td');
    celda.appendChild(PAGINA.estado(valor));
    return celda;
  }

  function pintarMedicos() {
    const filas = document.getElementById('filas-medicos');
    filas.replaceChildren();
    datos.medicos.forEach(m => {
      const fila = document.createElement('tr');
      fila.appendChild(PAGINA.crear('td', 'numero', m.id));
      fila.appendChild(PAGINA.crear('td', null, m.nombre));
      fila.appendChild(PAGINA.crear('td', 'texto-suave', m.especialidad));
      fila.appendChild(PAGINA.crear('td', 'texto-suave', m.colegiado));
      fila.appendChild(celdaEstado(m.estado));
      fila.appendChild(celdaAcciones('medico', m));
      filas.appendChild(fila);
    });
  }

  function pintarRecepcionistas() {
    const filas = document.getElementById('filas-recepcionistas');
    filas.replaceChildren();
    datos.recepcionistas.forEach(r => {
      const fila = document.createElement('tr');
      fila.appendChild(PAGINA.crear('td', 'numero', r.id));
      fila.appendChild(PAGINA.crear('td', null, r.nombre));
      fila.appendChild(celdaEstado(r.estado));
      fila.appendChild(celdaAcciones('recepcionista', r));
      filas.appendChild(fila);
    });
  }

  const campoBuscar = document.getElementById('buscar-paciente');

  function pintarPacientes() {
    const filas = document.getElementById('filas-pacientes');
    const texto = campoBuscar.value.trim().toLowerCase();
    const lista = datos.pacientes.filter(p =>
      !texto || p.nombre.toLowerCase().includes(texto) || String(p.id) === texto
    );

    document.getElementById('resumen-pacientes').textContent =
      lista.length + ' de ' + datos.pacientes.length + ' pacientes';

    filas.replaceChildren();
    lista.forEach(p => {
      const fila = document.createElement('tr');
      fila.appendChild(PAGINA.crear('td', 'numero', p.id));
      fila.appendChild(PAGINA.crear('td', null, p.nombre));
      fila.appendChild(celdaEstado(p.estado));
      fila.appendChild(celdaAcciones('paciente', p));
      filas.appendChild(fila);
    });
  }

  campoBuscar.addEventListener('input', pintarPacientes);

  // Especialidades que ya existen, tomadas de los médicos activos e inactivos
  function especialidadesExistentes() {
    return [...new Set(datos.medicos.map(m => m.especialidad).filter(Boolean))].sort();
  }

  function llenarEspecialidades() {
    const lista = document.getElementById('lista-especialidades');
    lista.replaceChildren(...especialidadesExistentes().map(e => {
      const opcion = document.createElement('option');
      opcion.value = e;
      return opcion;
    }));
  }

  // Forma comparable: sin tildes, sin mayúsculas y con un solo espacio
  function normalizar(texto) {
    return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/\s+/g, ' ').trim();
  }

  // Devuelve la especialidad que se debe enviar, o null si el
  // administrador decide no crear una nueva.
  //   Ya existe (aunque cambien mayúsculas, tildes o espacios) → la del catálogo
  //   No existe → se pide confirmación, para atrapar errores de escritura
  function resolverEspecialidad(escrita) {
    const existentes = especialidadesExistentes();
    const igual = existentes.find(e => normalizar(e) === normalizar(escrita));
    if (igual) {
      return igual;
    }
    const crear = window.confirm(
      'La especialidad «' + escrita + '» no existe.\n\n'
      + 'Las que existen son: ' + existentes.join(', ') + '.\n\n'
      + '¿Crear «' + escrita + '» como especialidad nueva?'
    );
    return crear ? escrita : null;
  }

  // --- Operaciones de WF-09 ---

  const AVISOS = {
    desactivar: {
      medico: 'Sus citas futuras pasarán a otro médico de su especialidad o de Medicina General; las que nadie pueda atender se cancelarán, y cada paciente recibirá un correo.',
      recepcionista: 'Su token dejará de funcionar de inmediato.',
      paciente: 'No podrá pedir citas mientras esté inactivo.'
    },
    dar_baja: {
      medico: 'La baja es DEFINITIVA y no se puede revertir. Sus citas futuras se reasignarán o cancelarán.',
      recepcionista: 'La baja es DEFINITIVA y no se puede revertir.',
      paciente: 'La baja es DEFINITIVA y no se puede revertir. Su historial se conserva.'
    },
    reactivar: {
      medico: 'Recibirá un token nuevo. Sus citas anteriores no vuelven: ya tienen otro médico.',
      recepcionista: 'Recibirá un token nuevo.',
      paciente: 'Podrá volver a pedir citas.'
    }
  };

  const VERBOS = { desactivar: 'Desactivar', dar_baja: 'Dar de baja', reactivar: 'Reactivar' };

  async function ejecutar(accion, entidad, p) {
    const confirmado = window.confirm(
      VERBOS[accion] + ' a ' + p.nombre + ' (n.º ' + p.id + ').\n\n' + AVISOS[accion][entidad] + '\n\n¿Continuar?'
    );
    if (!confirmado) {
      return;
    }

    const respuesta = await API.llamar('admin', { accion, entidad, id: p.id });
    if (respuesta.codigo !== 200 && respuesta.codigo !== 201) {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      window.scrollTo(0, 0);
      return;
    }

    let texto = respuesta.mensaje || 'Operación realizada';
    if (entidad === 'medico' && accion !== 'reactivar' && respuesta.citas_reasignadas !== undefined) {
      texto += '. Citas reasignadas: ' + respuesta.citas_reasignadas
        + '; canceladas: ' + respuesta.citas_canceladas + '.';
    }
    PAGINA.mostrarMensaje(mensaje, 'exito', texto);

    const token = respuesta.token || respuesta.token_nuevo;
    if (token) {
      mostrarToken(p.nombre, token);
    } else {
      window.scrollTo(0, 0);
    }
    cargar();
  }

  async function agregar(entidad, cuerpo, formulario) {
    const respuesta = await API.llamar('admin', Object.assign({ accion: 'agregar', entidad }, cuerpo));
    if (respuesta.codigo === 201) {
      PAGINA.mostrarMensaje(mensaje, 'exito', respuesta.mensaje || 'Persona agregada');
      const token = respuesta.token || respuesta.token_nuevo;
      if (token) {
        mostrarToken(cuerpo.nombre, token);
      }
      formulario.reset();
      cargar();
    } else {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      window.scrollTo(0, 0);
    }
  }

  const formularioMedico = document.getElementById('formulario-medico');
  formularioMedico.addEventListener('submit', evento => {
    evento.preventDefault();
    const campoEspecialidad = document.getElementById('medico-especialidad');
    const escrita = campoEspecialidad.value.trim();

    let especialidad = escrita;
    if (escrita) {
      especialidad = resolverEspecialidad(escrita);
      if (especialidad === null) {
        campoEspecialidad.focus();
        campoEspecialidad.select();
        return;
      }
      campoEspecialidad.value = especialidad;
    }

    agregar('medico', {
      nombre: document.getElementById('medico-nombre').value.trim(),
      especialidad,
      colegiado: document.getElementById('medico-colegiado').value.trim()
    }, formularioMedico);
  });

  const formularioRecepcionista = document.getElementById('formulario-recepcionista');
  formularioRecepcionista.addEventListener('submit', evento => {
    evento.preventDefault();
    agregar('recepcionista', {
      nombre: document.getElementById('recepcionista-nombre').value.trim()
    }, formularioRecepcionista);
  });

  cargar();
})();
