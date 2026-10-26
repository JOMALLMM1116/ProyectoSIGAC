// panel.js — SIGAC, pantalla de recepción
// Tres pestañas: citas del día (WF-10 «citas» y cancelación con WF-04),
// nueva solicitud (WF-01) y lista de espera (WF-10 «lista_espera»).

(() => {
  const persona = PAGINA.iniciar('recepcion');
  if (!persona) {
    return;
  }

  const mensaje = document.getElementById('mensaje');

  // --- Pestañas ---

  const pestanas = document.querySelectorAll('.pestana');
  const secciones = {
    citas: document.getElementById('seccion-citas'),
    nueva: document.getElementById('seccion-nueva'),
    espera: document.getElementById('seccion-espera')
  };

  function mostrarSeccion(nombre) {
    pestanas.forEach(p => p.setAttribute('aria-selected', String(p.dataset.seccion === nombre)));
    Object.entries(secciones).forEach(([clave, seccion]) => {
      seccion.classList.toggle('oculto', clave !== nombre);
    });
    PAGINA.ocultarMensaje(mensaje);
    if (nombre === 'citas') {
      cargarCitas();
    } else if (nombre === 'espera') {
      cargarEspera();
    }
  }

  pestanas.forEach(p => p.addEventListener('click', () => mostrarSeccion(p.dataset.seccion)));

  // --- Citas del día ---

  const campoFecha = document.getElementById('fecha');
  const filasCitas = document.getElementById('filas-citas');
  const resumenCitas = document.getElementById('resumen-citas');
  const sinCitas = document.getElementById('sin-citas');

  async function cargarCitas() {
    filasCitas.replaceChildren();
    resumenCitas.textContent = 'Cargando…';

    const respuesta = await API.llamar('consulta', { consulta: 'citas', fecha: campoFecha.value });
    if (respuesta.codigo !== 200) {
      resumenCitas.textContent = '';
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      return;
    }

    const citas = respuesta.citas || [];
    const vigentes = citas.filter(c => c.estado !== 'cancelada').length;
    resumenCitas.textContent = citas.length + ' citas, ' + vigentes + ' vigentes';
    sinCitas.classList.toggle('oculto', citas.length > 0);

    citas.forEach(cita => {
      const fila = document.createElement('tr');
      fila.appendChild(PAGINA.crear('td', 'hora', cita.hora));
      fila.appendChild(PAGINA.crear('td', null, cita.paciente));
      fila.appendChild(PAGINA.crear('td', null, cita.medico));
      fila.appendChild(PAGINA.crear('td', 'texto-suave', cita.especialidad));

      const celdaEstado = document.createElement('td');
      celdaEstado.appendChild(PAGINA.estado(cita.estado));
      fila.appendChild(celdaEstado);

      fila.appendChild(PAGINA.crear('td', 'texto-suave', cita.notificada ? 'Enviado' : 'Pendiente'));

      const celdaAccion = document.createElement('td');
      if (cita.estado === 'confirmada') {
        const boton = PAGINA.crear('button', 'boton boton-peligro boton-pequeno', 'Cancelar');
        boton.type = 'button';
        boton.addEventListener('click', () => cancelar(cita));
        celdaAccion.appendChild(boton);
      }
      fila.appendChild(celdaAccion);

      filasCitas.appendChild(fila);
    });
  }

  async function cancelar(cita) {
    const confirmado = window.confirm(
      '¿Cancelar la cita de las ' + cita.hora + ' de ' + cita.paciente + ' con ' + cita.medico + '?'
    );
    if (!confirmado) {
      return;
    }
    const motivo = (window.prompt('Motivo de la cancelación (opcional):') || '').trim();

    const cuerpo = { id_cita: cita.id_cita };
    if (motivo) {
      cuerpo.motivo = motivo;
    }

    const respuesta = await API.llamar('cancelar', cuerpo);
    if (respuesta.codigo === 200) {
      const texto = respuesta.estado === 'reasignado'
        ? 'Cita cancelada. El cupo pasó al siguiente paciente en espera, que recibirá su aviso en unos minutos.'
        : 'Cita cancelada. No había nadie esperando un cupo para esa fecha.';
      PAGINA.mostrarMensaje(mensaje, 'exito', texto);
      cargarCitas();
    } else {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
    }
  }

  campoFecha.value = PAGINA.hoy();
  campoFecha.addEventListener('change', cargarCitas);
  document.getElementById('boton-hoy').addEventListener('click', () => {
    campoFecha.value = PAGINA.hoy();
    cargarCitas();
  });

  // --- Nueva solicitud ---

  const formulario = document.getElementById('formulario-solicitud');

  function valor(id) {
    return document.getElementById(id).value.trim();
  }

  async function registrar(evento) {
    evento.preventDefault();

    const cuerpo = {
      dpi: valor('dpi'),
      nombre: valor('nombre'),
      apellido: valor('apellido'),
      telefono: valor('telefono'),
      correo: valor('correo'),
      fecha_nacimiento: valor('fecha-nacimiento'),
      tipo_consulta: valor('tipo-consulta'),
      motivo: valor('motivo'),
      fecha_preferida: valor('fecha-preferida')
    };

    const franja = valor('franja');
    const hora = valor('hora');
    const especialidad = valor('especialidad');
    const idMedico = valor('id-medico');
    if (franja) cuerpo.franja_preferida = franja;
    if (hora) cuerpo.hora_solicitada = hora.slice(0, 5);
    if (especialidad) cuerpo.especialidad_solicitada = especialidad;
    if (idMedico) cuerpo.id_medico_solicitado = idMedico;

    const respuesta = await API.llamar('cita', cuerpo);
    window.scrollTo(0, 0);

    if (respuesta.codigo === 201) {
      PAGINA.mostrarMensaje(mensaje, 'exito',
        'Solicitud ' + respuesta.id_solicitud + ' registrada. El sistema asignará médico y horario en los próximos minutos, y el paciente recibirá un correo.');
      formulario.reset();
    } else {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
    }
  }

  formulario.addEventListener('submit', registrar);

  // --- Lista de espera ---

  const filasEspera = document.getElementById('filas-espera');
  const resumenEspera = document.getElementById('resumen-espera');
  const sinEspera = document.getElementById('sin-espera');

  async function cargarEspera() {
    filasEspera.replaceChildren();
    resumenEspera.textContent = 'Cargando…';

    const respuesta = await API.llamar('consulta', { consulta: 'lista_espera' });
    if (respuesta.codigo !== 200) {
      resumenEspera.textContent = '';
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      return;
    }

    const espera = respuesta.espera || [];
    const hoy = PAGINA.hoy();
    const vencidas = espera.filter(e => e.fecha_preferida < hoy).length;
    resumenEspera.textContent = espera.length + ' en espera'
      + (vencidas ? ', ' + vencidas + ' con la fecha ya pasada' : '');
    sinEspera.classList.toggle('oculto', espera.length > 0);

    espera.forEach(e => {
      const fila = document.createElement('tr');

      const celdaFecha = PAGINA.crear('td', 'numero', e.fecha_preferida + ' ');
      if (e.fecha_preferida < hoy) {
        celdaFecha.appendChild(PAGINA.estado('vencida'));
      }
      fila.appendChild(celdaFecha);

      fila.appendChild(PAGINA.crear('td', null, e.paciente));
      fila.appendChild(PAGINA.crear('td', null, e.tipo_consulta));

      const preferencia = [
        e.franja_preferida && e.franja_preferida !== 'indiferente'
          ? (e.franja_preferida === 'manana' ? 'Mañana' : 'Tarde')
          : null,
        e.especialidad_solicitada
      ].filter(Boolean).join(', ');
      fila.appendChild(PAGINA.crear('td', 'texto-suave', preferencia || 'Sin preferencia'));

      fila.appendChild(PAGINA.crear('td', 'numero', e.prioridad));
      fila.appendChild(PAGINA.crear('td', 'texto-suave', e.en_espera_desde));
      filasEspera.appendChild(fila);
    });
  }

  document.getElementById('boton-actualizar-espera').addEventListener('click', cargarEspera);

  cargarCitas();
})();
