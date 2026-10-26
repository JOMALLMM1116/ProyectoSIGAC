// agenda.js — SIGAC, pantalla del médico
// Muestra las citas del día (WF-10, consulta «agenda») y, en el panel
// lateral, permite ver el historial (WF-08), escribir la nota (WF-07)
// y cerrar la cita (WF-05). El médico siempre sale del token.

(() => {
  const persona = PAGINA.iniciar('medico');
  if (!persona) {
    return;
  }

  const campoFecha = document.getElementById('fecha');
  const botonHoy = document.getElementById('boton-hoy');
  const mensaje = document.getElementById('mensaje');
  const resumen = document.getElementById('resumen');
  const filas = document.getElementById('filas-agenda');
  const sinCitas = document.getElementById('sin-citas');

  const panel = document.getElementById('panel');
  const panelPaciente = document.getElementById('panel-paciente');
  const panelDetalle = document.getElementById('panel-detalle');
  const panelMotivo = document.getElementById('panel-motivo');
  const panelMensaje = document.getElementById('panel-mensaje');
  const listaHistorial = document.getElementById('lista-historial');
  const formularioNota = document.getElementById('formulario-nota');
  const campoDiagnostico = document.getElementById('diagnostico');
  const campoIndicaciones = document.getElementById('indicaciones');
  const botonAtendida = document.getElementById('boton-atendida');
  const botonAusente = document.getElementById('boton-ausente');

  let citas = [];
  let citaAbierta = null;

  // Si el médico ya pidió el historial de la cita abierta. Solo entonces
  // se vuelve a cargar después de guardar una nota: cada consulta del
  // historial queda en la bitácora, y no deben registrarse lecturas que
  // el médico no pidió.
  let historialAbierto = false;

  // --- Agenda ---

  async function cargar() {
    PAGINA.ocultarMensaje(mensaje);
    filas.replaceChildren();
    resumen.textContent = 'Cargando…';

    const respuesta = await API.llamar('consulta', { consulta: 'agenda', fecha: campoFecha.value });

    if (respuesta.codigo !== 200) {
      resumen.textContent = '';
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      return;
    }

    citas = respuesta.citas || [];
    resumen.textContent = citas.length === 1 ? '1 cita' : citas.length + ' citas';
    sinCitas.classList.toggle('oculto', citas.length > 0);

    citas.forEach(cita => {
      const fila = document.createElement('tr');
      fila.appendChild(PAGINA.crear('td', 'hora', cita.hora));
      fila.appendChild(PAGINA.crear('td', null, cita.paciente));
      fila.appendChild(PAGINA.crear('td', null, cita.tipo_consulta || ''));

      const celdaEstado = document.createElement('td');
      celdaEstado.appendChild(PAGINA.estado(cita.estado));
      fila.appendChild(celdaEstado);

      fila.appendChild(PAGINA.crear('td', 'texto-suave', cita.tiene_nota ? 'Escrita' : 'Sin nota'));

      const celdaAccion = document.createElement('td');
      const boton = PAGINA.crear('button', 'boton boton-pequeno', 'Abrir');
      boton.type = 'button';
      boton.addEventListener('click', () => abrirPanel(cita.id_cita));
      celdaAccion.appendChild(boton);
      fila.appendChild(celdaAccion);

      filas.appendChild(fila);
    });

    // Si había una cita abierta, se refresca con sus datos nuevos
    if (citaAbierta) {
      const actual = citas.find(c => c.id_cita === citaAbierta.id_cita);
      if (actual) {
        pintarPanel(actual);
      } else {
        cerrarPanel();
      }
    }
  }

  // --- Panel lateral ---

  function pintarPanel(cita) {
    citaAbierta = cita;
    panelPaciente.textContent = cita.paciente;
    panelDetalle.textContent = cita.hora + ', cita ' + cita.id_cita;
    panelMotivo.textContent = cita.motivo ? 'Motivo: ' + cita.motivo : '';

    const cerrable = cita.estado === 'confirmada';
    botonAtendida.disabled = !cerrable;
    botonAusente.disabled = !cerrable;
  }

  function abrirPanel(idCita) {
    const cita = citas.find(c => c.id_cita === idCita);
    if (!cita) {
      return;
    }
    PAGINA.ocultarMensaje(panelMensaje);
    listaHistorial.replaceChildren();
    historialAbierto = false;
    formularioNota.reset();
    pintarPanel(cita);
    panel.classList.remove('oculto');
  }

  function cerrarPanel() {
    citaAbierta = null;
    historialAbierto = false;
    panel.classList.add('oculto');
  }

  // --- Historial (WF-08) ---

  async function verHistorial() {
    historialAbierto = true;
    listaHistorial.replaceChildren(PAGINA.crear('p', 'texto-suave', 'Cargando historial…'));
    const respuesta = await API.llamar('historial', { id_cita: citaAbierta.id_cita });

    listaHistorial.replaceChildren();
    if (respuesta.codigo !== 200) {
      PAGINA.mostrarMensaje(panelMensaje, 'error', PAGINA.textoError(respuesta));
      return;
    }

    const notas = respuesta.notas || respuesta.historial || [];
    if (notas.length === 0) {
      listaHistorial.appendChild(PAGINA.crear('p', 'texto-suave', 'Este paciente todavía no tiene notas clínicas.'));
      return;
    }

    notas.forEach(nota => {
      const bloque = PAGINA.crear('article', 'nota-historial');
      const quien = [nota.fecha || nota.creado_en, nota.medico, nota.especialidad].filter(Boolean).join(', ');
      bloque.appendChild(PAGINA.crear('p', 'texto-suave', quien));
      bloque.appendChild(PAGINA.crear('p', 'nota-diagnostico', nota.diagnostico));
      if (nota.indicaciones) {
        bloque.appendChild(PAGINA.crear('p', null, 'Indicaciones: ' + nota.indicaciones));
      }
      listaHistorial.appendChild(bloque);
    });
  }

  // --- Nueva nota (WF-07) ---

  async function guardarNota(evento) {
    evento.preventDefault();
    const diagnostico = campoDiagnostico.value.trim();
    if (!diagnostico) {
      PAGINA.mostrarMensaje(panelMensaje, 'error', 'Escribe el diagnóstico.');
      campoDiagnostico.focus();
      return;
    }

    const cuerpo = { id_cita: citaAbierta.id_cita, diagnostico };
    const indicaciones = campoIndicaciones.value.trim();
    if (indicaciones) {
      cuerpo.indicaciones = indicaciones;
    }

    const respuesta = await API.llamar('nota', cuerpo);
    if (respuesta.codigo === 201) {
      PAGINA.mostrarMensaje(panelMensaje, 'exito', 'Nota guardada.');
      formularioNota.reset();
      await cargar();
      if (historialAbierto) {
        await verHistorial();
      }
    } else {
      PAGINA.mostrarMensaje(panelMensaje, 'error', PAGINA.textoError(respuesta));
    }
  }

  // --- Cierre de la cita (WF-05) ---

  async function cerrarCita(resultado) {
    const respuesta = await API.llamar('cerrar', { id_cita: citaAbierta.id_cita, resultado });
    if (respuesta.codigo === 200) {
      PAGINA.mostrarMensaje(panelMensaje, 'exito',
        resultado === 'atendida' ? 'Cita marcada como atendida.' : 'Cita marcada como ausente.');
      await cargar();
    } else {
      PAGINA.mostrarMensaje(panelMensaje, 'error', PAGINA.textoError(respuesta));
    }
  }

  // --- Eventos ---

  campoFecha.value = PAGINA.hoy();
  campoFecha.addEventListener('change', cargar);
  botonHoy.addEventListener('click', () => {
    campoFecha.value = PAGINA.hoy();
    cargar();
  });
  document.getElementById('boton-cerrar-panel').addEventListener('click', cerrarPanel);
  document.getElementById('boton-historial').addEventListener('click', verHistorial);
  formularioNota.addEventListener('submit', guardarNota);
  botonAtendida.addEventListener('click', () => cerrarCita('atendida'));
  botonAusente.addEventListener('click', () => cerrarCita('ausente'));

  cargar();
})();
