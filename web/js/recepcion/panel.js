// panel.js — SIGAC, pantalla de recepción
// Cuatro secciones, como en el mockup de Figma:
//   Panel principal   — resumen del día (WF-10 «citas» y «lista_espera»)
//   Nueva solicitud   — registro con validación por campo (WF-01)
//   Citas             — rango de fechas, filtros, paginación y cancelación (WF-04)
//   Lista de espera   — la lista completa (WF-10 «lista_espera»)
// La validación de la página solo ayuda a la persona: WF-01 sigue siendo
// quien valida de verdad, y sus rechazos se muestran arriba.

(() => {
  const persona = PAGINA.iniciar('recepcion');
  if (!persona) {
    return;
  }

  const mensaje = document.getElementById('mensaje');
  const ESTADOS = { confirmada: 'Confirmada', atendida: 'Atendida', ausente: 'Ausente', cancelada: 'Cancelada' };
  const TIPOS = { general: 'General', control: 'Control', urgencia: 'Urgencia' };
  const MAXIMO_DIAS = 31;
  const POR_PAGINA = 12;

  // --- Utilidades ---

  function fechaCorta(iso) {
    if (!iso) return '';
    const [a, m, d] = iso.slice(0, 10).split('-');
    return d + '/' + m + '/' + a;
  }

  function sumarDias(iso, dias) {
    const [a, m, d] = iso.split('-').map(Number);
    const fecha = new Date(Date.UTC(a, m - 1, d + dias));
    return fecha.toISOString().slice(0, 10);
  }

  function fechaLarga() {
    const texto = new Intl.DateTimeFormat('es-GT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Guatemala'
    }).format(new Date());
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function horaActual() {
    return new Intl.DateTimeFormat('es-GT', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Guatemala'
    }).format(new Date());
  }

  function etiquetaTipo(tipo) {
    return PAGINA.crear('span', 'tipo tipo-' + tipo, TIPOS[tipo] || tipo || '');
  }

  function puntoEstado(estado) {
    return PAGINA.crear('span', 'punto punto-' + estado, ESTADOS[estado] || estado);
  }

  // Prioridad: el sistema guarda un número; 1 es la más urgente (orden de WF-04)
  function prioridad(numero) {
    if (numero <= 2) return PAGINA.crear('span', 'prioridad prioridad-alta', 'Alta');
    if (numero === 3) return PAGINA.crear('span', 'prioridad prioridad-media', 'Media');
    return PAGINA.crear('span', 'prioridad prioridad-baja', 'Baja');
  }

  function celda(contenido, clase) {
    const td = document.createElement('td');
    if (clase) td.className = clase;
    if (contenido instanceof Node) {
      td.appendChild(contenido);
    } else {
      td.textContent = contenido === undefined || contenido === null ? '' : String(contenido);
    }
    return td;
  }

  // Primer nombre y primer apellido, para la barra lateral.
  //   «Apellidos, Nombres»  → primer nombre + primer apellido
  //   cuatro o más palabras → primera + tercera (dos nombres, dos apellidos)
  //   tres palabras o menos → las dos primeras (no se puede saber cuál es el apellido)
  function nombreCorto(completo) {
    if (completo.includes(',')) {
      const [apellidos, nombres] = completo.split(',').map(p => p.trim().split(/\s+/));
      return [nombres[0], apellidos[0]].filter(Boolean).join(' ');
    }
    const palabras = completo.trim().split(/\s+/);
    if (palabras.length >= 4) {
      return palabras[0] + ' ' + palabras[2];
    }
    return palabras.slice(0, 2).join(' ');
  }

  const corto = nombreCorto(persona.nombre);
  const nombreBarra = document.getElementById('nombre-persona');
  nombreBarra.textContent = corto;
  nombreBarra.title = persona.nombre;

  const iniciales = corto.split(' ');
  document.getElementById('avatar').textContent =
    ((iniciales[0] || '').charAt(0) + (iniciales[1] || '').charAt(0)).toUpperCase();

  // --- Secciones ---

  const opciones = document.querySelectorAll('.opcion-menu');
  const secciones = {
    panel: document.getElementById('seccion-panel'),
    nueva: document.getElementById('seccion-nueva'),
    citas: document.getElementById('seccion-citas'),
    espera: document.getElementById('seccion-espera')
  };
  const titulo = document.getElementById('titulo-seccion');
  const subtitulo = document.getElementById('subtitulo-seccion');
  const cajaBuscarHoy = document.getElementById('caja-buscar-hoy');
  const botonNueva = document.getElementById('boton-nueva');

  const TITULOS = {
    panel: ['Panel principal', fechaLarga()],
    nueva: ['Nueva solicitud de cita', 'Los campos marcados con asterisco son obligatorios'],
    citas: ['Citas', ''],
    espera: ['Lista de espera', '']
  };

  function mostrarSeccion(nombre) {
    opciones.forEach(o => {
      if (o.dataset.seccion === nombre) {
        o.setAttribute('aria-current', 'page');
      } else {
        o.removeAttribute('aria-current');
      }
    });
    Object.entries(secciones).forEach(([clave, s]) => s.classList.toggle('oculto', clave !== nombre));
    titulo.textContent = TITULOS[nombre][0];
    subtitulo.textContent = TITULOS[nombre][1];
    cajaBuscarHoy.classList.toggle('oculto', nombre !== 'panel');
    botonNueva.classList.toggle('oculto', nombre === 'nueva');
    PAGINA.ocultarMensaje(mensaje);

    if (nombre === 'panel') cargarPanel();
    if (nombre === 'citas') cargarCitas();
    if (nombre === 'espera') cargarEspera();
  }

  opciones.forEach(o => o.addEventListener('click', () => mostrarSeccion(o.dataset.seccion)));
  botonNueva.addEventListener('click', () => mostrarSeccion('nueva'));
  document.getElementById('ver-todas').addEventListener('click', () => mostrarSeccion('citas'));
  document.getElementById('ver-espera').addEventListener('click', () => mostrarSeccion('espera'));

  // --- Actividad de esta sesión ---

  const actividad = [];
  const listaActividad = document.getElementById('lista-actividad');
  const sinActividad = document.getElementById('sin-actividad');

  function registrarActividad(texto, tipo) {
    actividad.unshift({ texto, tipo, hora: horaActual() });
    actividad.splice(8);
    listaActividad.replaceChildren(...actividad.map(a => {
      const li = PAGINA.crear('li', a.tipo === 'cancelada' ? 'actividad-cancelada' : null);
      li.appendChild(PAGINA.crear('span', 'texto', a.texto));
      li.appendChild(PAGINA.crear('span', 'hora-actividad', a.hora));
      return li;
    }));
    sinActividad.classList.toggle('oculto', actividad.length > 0);
  }

  // --- Panel principal ---

  let citasHoy = [];
  const filasHoy = document.getElementById('filas-hoy');
  const sinHoy = document.getElementById('sin-hoy');
  const buscarHoy = document.getElementById('buscar-hoy');

  async function cargarPanel() {
    const [rCitas, rEspera] = await Promise.all([
      API.llamar('consulta', { consulta: 'citas', fecha: PAGINA.hoy() }),
      API.llamar('consulta', { consulta: 'lista_espera' })
    ]);

    if (rCitas.codigo !== 200) {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(rCitas));
    } else {
      citasHoy = rCitas.citas || [];
      document.getElementById('dato-total').textContent = citasHoy.filter(c => c.estado !== 'cancelada').length;
      document.getElementById('dato-confirmadas').textContent = citasHoy.filter(c => c.estado === 'confirmada').length;
      document.getElementById('dato-canceladas').textContent = citasHoy.filter(c => c.estado === 'cancelada').length;
      pintarHoy();
    }

    if (rEspera.codigo === 200) {
      const espera = rEspera.espera || [];
      document.getElementById('dato-espera').textContent = espera.length;
      document.getElementById('contador-espera').textContent = espera.length;
      document.getElementById('sin-espera-corta').classList.toggle('oculto', espera.length > 0);
      document.getElementById('lista-espera-corta').replaceChildren(...espera.slice(0, 3).map(e => {
        const li = document.createElement('li');
        const datos = document.createElement('div');
        datos.appendChild(PAGINA.crear('p', 'nombre', e.paciente));
        datos.appendChild(PAGINA.crear('p', 'detalle',
          (TIPOS[e.tipo_consulta] || e.tipo_consulta) + ', para el ' + fechaCorta(e.fecha_preferida)));
        li.appendChild(datos);
        li.appendChild(prioridad(e.prioridad));
        return li;
      }));
    }
  }

  function pintarHoy() {
    const texto = buscarHoy.value.trim().toLowerCase();
    const lista = citasHoy.filter(c => !texto
      || c.paciente.toLowerCase().includes(texto)
      || c.medico.toLowerCase().includes(texto));

    filasHoy.replaceChildren(...lista.map(c => {
      const fila = document.createElement('tr');
      if (c.estado === 'cancelada') fila.className = 'fila-cancelada';
      fila.appendChild(celda(c.hora, 'hora'));
      fila.appendChild(celda(c.paciente));
      fila.appendChild(celda(c.medico, 'texto-suave'));
      fila.appendChild(celda(etiquetaTipo(c.tipo_consulta)));
      fila.appendChild(celda(puntoEstado(c.estado)));
      return fila;
    }));
    sinHoy.classList.toggle('oculto', lista.length > 0);
  }

  buscarHoy.addEventListener('input', pintarHoy);

  // --- Nueva solicitud ---

  const formulario = document.getElementById('formulario-solicitud');
  const botonesTipo = document.querySelectorAll('.segmentado button');
  const motivo = document.getElementById('motivo');
  const contadorMotivo = document.getElementById('contador-motivo');
  let tipoElegido = 'general';

  function elegirTipo(tipo) {
    tipoElegido = tipo;
    botonesTipo.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipo === tipo)));
  }

  botonesTipo.forEach(b => b.addEventListener('click', () => elegirTipo(b.dataset.tipo)));

  motivo.addEventListener('input', () => {
    contadorMotivo.textContent = motivo.value.length + ' / 255';
  });

  const CAMPOS = ['dpi', 'fecha-nacimiento', 'nombre', 'apellido', 'telefono', 'correo', 'fecha-preferida'];

  function valor(id) {
    return document.getElementById(id).value.trim();
  }

  function marcarError(id, texto) {
    document.getElementById('campo-' + id).classList.add('campo-error');
    const error = document.getElementById('error-' + id);
    error.textContent = texto;
    error.classList.remove('oculto');
  }

  function limpiarError(id) {
    document.getElementById('campo-' + id).classList.remove('campo-error');
    const error = document.getElementById('error-' + id);
    error.textContent = '';
    error.classList.add('oculto');
  }

  CAMPOS.forEach(id => document.getElementById(id).addEventListener('input', () => limpiarError(id)));

  function validar() {
    CAMPOS.forEach(limpiarError);
    const errores = [];
    const hoy = PAGINA.hoy();

    if (!/^\d{13}$/.test(valor('dpi'))) errores.push(['dpi', 'El DPI debe tener exactamente 13 dígitos']);

    const nacimiento = valor('fecha-nacimiento');
    if (!nacimiento) errores.push(['fecha-nacimiento', 'La fecha de nacimiento es obligatoria']);
    else if (nacimiento > hoy) errores.push(['fecha-nacimiento', 'La fecha de nacimiento no puede ser futura']);
    else if (nacimiento < '1900-01-01') errores.push(['fecha-nacimiento', 'La fecha de nacimiento no puede ser anterior a 1900']);

    if (!valor('nombre')) errores.push(['nombre', 'El nombre es obligatorio']);
    if (!valor('apellido')) errores.push(['apellido', 'El apellido es obligatorio']);
    if (!/^[2-8]\d{7}$/.test(valor('telefono'))) errores.push(['telefono', 'El teléfono debe tener 8 dígitos e iniciar entre 2 y 8']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor('correo'))) errores.push(['correo', 'Escribe un correo válido, como ejemplo@correo.com']);

    const preferida = valor('fecha-preferida');
    if (!preferida) errores.push(['fecha-preferida', 'La fecha preferida es obligatoria']);
    else if (preferida < hoy) errores.push(['fecha-preferida', 'La fecha preferida no puede ser anterior al día actual']);

    errores.forEach(([id, texto]) => marcarError(id, texto));
    return errores;
  }

  function reiniciarFormulario() {
    formulario.reset();
    CAMPOS.forEach(limpiarError);
    elegirTipo('general');
    contadorMotivo.textContent = '0 / 255';
  }

  async function registrar(evento) {
    evento.preventDefault();
    const errores = validar();
    if (errores.length) {
      PAGINA.mostrarMensaje(mensaje, 'error', 'Revisa los campos marcados en rojo.');
      document.getElementById(errores[0][0]).focus();
      return;
    }

    const cuerpo = {
      dpi: valor('dpi'),
      nombre: valor('nombre'),
      apellido: valor('apellido'),
      telefono: valor('telefono'),
      correo: valor('correo'),
      fecha_nacimiento: valor('fecha-nacimiento'),
      tipo_consulta: tipoElegido,
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
      registrarActividad('Solicitud ' + respuesta.id_solicitud + ' registrada, ' + cuerpo.nombre + ' ' + cuerpo.apellido, 'registrada');
      reiniciarFormulario();
      mostrarSeccion('panel');
      PAGINA.mostrarMensaje(mensaje, 'exito',
        'Solicitud ' + respuesta.id_solicitud + ' registrada. El sistema asignará médico y horario en los próximos minutos, y el paciente recibirá un correo.');
    } else {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
    }
  }

  formulario.addEventListener('submit', registrar);
  document.getElementById('boton-cancelar-formulario').addEventListener('click', () => {
    reiniciarFormulario();
    mostrarSeccion('panel');
  });

  // --- Citas ---

  let citasRango = [];
  let paginaActual = 1;
  const desde = document.getElementById('filtro-desde');
  const hasta = document.getElementById('filtro-hasta');
  const buscarCitas = document.getElementById('buscar-citas');
  const filtroEstado = document.getElementById('filtro-estado');
  const filtroMedico = document.getElementById('filtro-medico');
  const filtroTipo = document.getElementById('filtro-tipo');
  const filasCitas = document.getElementById('filas-citas');
  const sinCitas = document.getElementById('sin-citas');
  const textoPaginacion = document.getElementById('texto-paginacion');
  const paginas = document.getElementById('paginas');

  function rangoPorDefecto() {
    const hoy = PAGINA.hoy();
    desde.value = sumarDias(hoy, -7);
    hasta.value = sumarDias(hoy, 7);
  }

  function diasDelRango() {
    const dias = [];
    let dia = desde.value;
    while (dia <= hasta.value && dias.length <= MAXIMO_DIAS) {
      dias.push(dia);
      dia = sumarDias(dia, 1);
    }
    return dias;
  }

  async function cargarCitas() {
    if (!desde.value || !hasta.value || desde.value > hasta.value) {
      PAGINA.mostrarMensaje(mensaje, 'error', 'Elige un rango válido: la fecha «desde» debe ser anterior o igual a «hasta».');
      return;
    }
    const dias = diasDelRango();
    if (dias.length > MAXIMO_DIAS) {
      PAGINA.mostrarMensaje(mensaje, 'error', 'El rango no puede superar ' + MAXIMO_DIAS + ' días.');
      return;
    }

    PAGINA.ocultarMensaje(mensaje);
    subtitulo.textContent = 'Cargando…';

    const respuestas = await Promise.all(dias.map(d => API.llamar('consulta', { consulta: 'citas', fecha: d })));
    const fallida = respuestas.find(r => r.codigo !== 200);
    if (fallida) {
      subtitulo.textContent = '';
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(fallida));
      return;
    }

    citasRango = respuestas.flatMap((r, i) => (r.citas || []).map(c => Object.assign({ fecha: dias[i] }, c)));

    const medicoElegido = filtroMedico.value;
    const medicos = [...new Set(citasRango.map(c => c.medico))].sort();
    filtroMedico.replaceChildren(PAGINA.crear('option', null, 'Todos'), ...medicos.map(m => {
      const opcion = PAGINA.crear('option', null, m);
      opcion.value = m;
      return opcion;
    }));
    filtroMedico.firstChild.value = '';
    filtroMedico.value = medicos.includes(medicoElegido) ? medicoElegido : '';

    paginaActual = 1;
    pintarCitas();
  }

  function citasFiltradas() {
    const texto = buscarCitas.value.trim().toLowerCase();
    return citasRango.filter(c =>
      (!texto || c.paciente.toLowerCase().includes(texto)) &&
      (!filtroEstado.value || c.estado === filtroEstado.value) &&
      (!filtroMedico.value || c.medico === filtroMedico.value) &&
      (!filtroTipo.value || c.tipo_consulta === filtroTipo.value));
  }

  function pintarCitas() {
    const lista = citasFiltradas();
    const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    paginaActual = Math.min(paginaActual, totalPaginas);
    const inicio = (paginaActual - 1) * POR_PAGINA;
    const visibles = lista.slice(inicio, inicio + POR_PAGINA);

    subtitulo.textContent = citasRango.length + ' citas registradas del ' + fechaCorta(desde.value) + ' al ' + fechaCorta(hasta.value);

    filasCitas.replaceChildren(...visibles.map(c => {
      const fila = document.createElement('tr');
      if (c.estado === 'cancelada') fila.className = 'fila-cancelada';
      fila.appendChild(celda(fechaCorta(c.fecha), 'numero'));
      fila.appendChild(celda(c.hora, 'hora'));
      fila.appendChild(celda(c.paciente));
      fila.appendChild(celda(c.medico, 'texto-suave'));
      fila.appendChild(celda(etiquetaTipo(c.tipo_consulta)));
      fila.appendChild(celda(puntoEstado(c.estado)));

      const acciones = document.createElement('td');
      if (c.estado === 'confirmada') {
        const boton = PAGINA.crear('button', 'boton-icono');
        boton.type = 'button';
        boton.title = 'Cancelar cita';
        boton.setAttribute('aria-label', 'Cancelar la cita de ' + c.paciente + ' a las ' + c.hora);
        boton.appendChild(PAGINA.icono('event_busy'));
        boton.addEventListener('click', () => cancelar(c));
        acciones.appendChild(boton);
      }
      fila.appendChild(acciones);
      return fila;
    }));
    sinCitas.classList.toggle('oculto', lista.length > 0);

    textoPaginacion.textContent = lista.length
      ? 'Mostrando ' + (inicio + 1) + ' a ' + (inicio + visibles.length) + ' de ' + lista.length + ' citas'
      : '';

    const botones = [];
    const anterior = PAGINA.crear('button', null, 'Anterior');
    anterior.type = 'button';
    anterior.disabled = paginaActual === 1;
    anterior.addEventListener('click', () => { paginaActual--; pintarCitas(); });
    botones.push(anterior);

    for (let n = 1; n <= totalPaginas; n++) {
      const b = PAGINA.crear('button', null, n);
      b.type = 'button';
      if (n === paginaActual) b.setAttribute('aria-current', 'page');
      b.addEventListener('click', () => { paginaActual = n; pintarCitas(); });
      botones.push(b);
    }

    const siguiente = PAGINA.crear('button', null, 'Siguiente');
    siguiente.type = 'button';
    siguiente.disabled = paginaActual === totalPaginas;
    siguiente.addEventListener('click', () => { paginaActual++; pintarCitas(); });
    botones.push(siguiente);

    paginas.replaceChildren(...botones);
  }

  [buscarCitas, filtroEstado, filtroMedico, filtroTipo].forEach(el => {
    el.addEventListener(el === buscarCitas ? 'input' : 'change', () => { paginaActual = 1; pintarCitas(); });
  });
  desde.addEventListener('change', cargarCitas);
  hasta.addEventListener('change', cargarCitas);

  document.getElementById('limpiar-filtros').addEventListener('click', () => {
    buscarCitas.value = '';
    filtroEstado.value = '';
    filtroMedico.value = '';
    filtroTipo.value = '';
    rangoPorDefecto();
    cargarCitas();
  });

  async function cancelar(cita) {
    const confirmado = window.confirm(
      '¿Cancelar la cita del ' + fechaCorta(cita.fecha) + ' a las ' + cita.hora + ' de ' + cita.paciente + ' con ' + cita.medico + '?'
    );
    if (!confirmado) {
      return;
    }
    const motivoCancelacion = (window.prompt('Motivo de la cancelación (opcional):') || '').trim();
    const cuerpo = { id_cita: cita.id_cita };
    if (motivoCancelacion) cuerpo.motivo = motivoCancelacion;

    const respuesta = await API.llamar('cancelar', cuerpo);
    if (respuesta.codigo === 200) {
      const reasignada = respuesta.estado === 'reasignado';
      registrarActividad(
        'Cita cancelada, ' + cita.paciente + (reasignada ? ' (cupo reasignado)' : ''),
        'cancelada');
      await cargarCitas();
      PAGINA.mostrarMensaje(mensaje, 'exito', reasignada
        ? 'Cita cancelada. El cupo pasó al siguiente paciente en espera, que recibirá su aviso en unos minutos.'
        : 'Cita cancelada. No había nadie esperando un cupo para esa fecha.');
    } else {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
    }
  }

  // --- Lista de espera ---

  const filasEspera = document.getElementById('filas-espera');
  const sinEspera = document.getElementById('sin-espera');

  async function cargarEspera() {
    filasEspera.replaceChildren();
    const respuesta = await API.llamar('consulta', { consulta: 'lista_espera' });
    if (respuesta.codigo !== 200) {
      PAGINA.mostrarMensaje(mensaje, 'error', PAGINA.textoError(respuesta));
      return;
    }

    const espera = respuesta.espera || [];
    const hoy = PAGINA.hoy();
    const vencidas = espera.filter(e => e.fecha_preferida < hoy).length;
    subtitulo.textContent = espera.length + ' en espera' + (vencidas ? ', ' + vencidas + ' con la fecha ya pasada' : '');
    sinEspera.classList.toggle('oculto', espera.length > 0);

    filasEspera.replaceChildren(...espera.map(e => {
      const fila = document.createElement('tr');
      const celdaFecha = celda(fechaCorta(e.fecha_preferida) + ' ', 'numero');
      if (e.fecha_preferida < hoy) celdaFecha.appendChild(PAGINA.estado('vencida'));
      fila.appendChild(celdaFecha);
      fila.appendChild(celda(e.paciente));
      fila.appendChild(celda(etiquetaTipo(e.tipo_consulta)));
      const preferencia = [
        e.franja_preferida && e.franja_preferida !== 'indiferente'
          ? (e.franja_preferida === 'manana' ? 'Mañana' : 'Tarde')
          : null,
        e.especialidad_solicitada
      ].filter(Boolean).join(', ');
      fila.appendChild(celda(preferencia || 'Sin preferencia', 'texto-suave'));
      fila.appendChild(celda(prioridad(e.prioridad)));
      fila.appendChild(celda(e.en_espera_desde, 'texto-suave'));
      return fila;
    }));
  }

  document.getElementById('boton-actualizar-espera').addEventListener('click', cargarEspera);

  // --- Inicio ---

  rangoPorDefecto();
  mostrarSeccion('panel');
})();
