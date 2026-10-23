# SIGAC — Sistema de Gestión de Atención Clínica

**Automatización de procesos con n8n en entorno local**

Universidad Mariano Gálvez de Guatemala
Facultad de Ingeniería en Sistemas de Información y Ciencias de la Computación — Campus Cobán

| Dato | Detalle |
|---|---|
| **Curso** | Análisis de Sistemas II — Código 0902-037 |
| **Catedrático** | Ing. Edgar Raúl Molina Rey |
| **Estudiante** | José Manuel Maquin Leal |
| **Carné** | 4090-22-3506 |
| **Correo** | jmaquinl@miumg.edu.gt |
| **Repositorio** | github.com/JOMALLMM1116/ProyectoSIGAC |
| **Entregable** | Proyecto Final — Entrega final |
| **Versión del documento** | v5 |
| **Fecha** | Cobán, Alta Verapaz — 23 de octubre de 2026 |

---

## 1. Ficha de inscripción del proyecto

Esta sección responde a la ficha de inscripción solicitada en la sección 7 de la guía del Proyecto Final.

| Campo requerido | Respuesta |
|---|---|
| **Modalidad de trabajo** | Individual |
| **Tema elegido** | Automatización de citas y expedientes de una clínica médica |
| **Nombre del sistema** | SIGAC — Sistema de Gestión de Atención Clínica |
| **Herramienta principal** | n8n 2.33.6 autoalojado en Docker, procesamiento y datos íntegramente locales |
| **Persistencia** | PostgreSQL 16 en contenedor, con volumen nombrado |
| **Enfoque de ciberseguridad** | Diez capas: credenciales en variables de entorno, autenticación por token, autorización por rol, identidad de la persona en el token, cifrado AES-256-GCM en reposo, bitácora de auditoría encadenada por hash SHA-256, auditoría de las lecturas de información clínica, validación de entradas, consultas parametrizadas y exclusión de datos sensibles del historial de ejecuciones |
| **Justificación del tema** | Una clínica maneja datos personales sensibles (DPI, teléfono, diagnóstico) sujetos a confidencialidad, lo que permite implementar controles de seguridad reales y no simbólicos. Además, el proceso de solicitud, asignación y notificación de citas es un flujo de negocio claro y acotado, adecuado al tamaño de un proyecto semestral. |

Al tratarse de modalidad individual, no aplican las secciones 8, 9, 10, 12 ni 16 de la guía, correspondientes a la documentación de trabajo en equipo.

---

## 2. Planteamiento del problema

En una clínica de atención general, la gestión de citas y expedientes presenta cuatro deficiencias observables cuando el proceso se ejecuta de forma manual:

- Las solicitudes de cita llegan por canales dispersos (llamadas, mensajería, presencial) sin un registro unificado.
- La asignación de cita a médico se realiza a criterio del personal de recepción, sin reglas de priorización explícitas ni verificación automática de disponibilidad.
- No existe trazabilidad sobre quién consultó o modificó un expediente, lo que impide auditar el acceso a información clínica.
- Los datos sensibles del paciente se almacenan y transmiten sin protección criptográfica ni control de acceso diferenciado.

El efecto acumulado es doble: pérdida de eficiencia operativa por reprocesos y sobreasignación, y exposición de información personal sensible sin controles verificables.

### 2.1 Solución propuesta

SIGAC automatiza mediante flujos de trabajo de n8n el ciclo completo de atención: solicitud → autenticación → autorización → validación → registro → clasificación → asignación → notificación → expediente → nota clínica → consulta del historial → cierre. Un flujo de administración gestiona además el alta, la suspensión y la baja de pacientes, médicos y recepcionistas sin borrar su historial. El procesamiento y los datos residen íntegramente en contenedores Docker locales, y la ciberseguridad se incorpora como eje transversal del diseño y no como un agregado posterior.

### 2.2 Correspondencia entre el problema y la solución

| Deficiencia | Cómo la resuelve SIGAC |
|---|---|
| Canales dispersos | Un único punto de entrada, `POST /webhook/cita`, con registro en la base de cada solicitud recibida |
| Asignación a criterio | WF-02 asigna por reglas explícitas: prioridad, especialidad, franja, cupos y carga de cada médico |
| Sin trazabilidad del expediente | Cada nota clínica queda firmada por el médico que la escribe, y cada lectura del historial queda registrada en la bitácora encadenada |
| Datos sensibles sin protección | DPI, teléfono, diagnóstico e indicaciones cifrados con AES-256-GCM; acceso por token, rol e identidad de la persona |

La tercera fila merece una aclaración. Las versiones v1 a v4 declaraban resuelta la trazabilidad del expediente, pero el sistema abría el expediente vacío y no ofrecía ninguna operación para escribirlo ni consultarlo: no había nada que rastrear. La promesa del planteamiento se cumple a partir de esta versión, con WF-07 y WF-08.

---

## 3. Objetivos

### 3.1 Objetivo general

Diseñar e implementar un sistema automatizado de gestión de citas y expedientes clínicos utilizando n8n sobre una infraestructura local en contenedores, que integre persistencia en PostgreSQL, manejo centralizado de errores y controles de ciberseguridad verificables, concluido y documentado antes de la fecha de entrega del Proyecto Final del curso.

### 3.2 Objetivos específicos

| # | Objetivo específico (SMART) | Verificación | Estado |
|:-:|---|---|:-:|
| 1 | Montar un entorno local reproducible con n8n, PostgreSQL, MailHog y Gotenberg orquestados mediante Docker Compose. | El comando `docker compose up -d` levanta el sistema completo | Cumplido |
| 2 | Implementar los flujos de trabajo que cubran ingesta, procesamiento, salida, reasignación, cierre, reportería, información clínica, administración de personas y manejo de errores. | Exportación JSON de los flujos en el repositorio | Cumplido — diez flujos |
| 3 | Diseñar un modelo de datos normalizado que soporte los datos operativos, la información clínica, la auditoría y el registro de errores. | Script `01_schema.sql` ejecutado sin errores | Cumplido — doce tablas |
| 4 | Implementar controles de ciberseguridad sobre los datos sensibles gestionados por el sistema. | Casos de prueba de la sección 11 | Cumplido — diez capas |
| 5 | Documentar y evidenciar casos de prueba con entradas válidas e inválidas. | Resultados registrados en la sección 11 de este documento | Cumplido |
| 6 | Incorporar la generación automática de un reporte semanal de indicadores en PDF. | Flujo WF-06 exportado y reporte generado | Cumplido |
| 7 | Completar el ciclo de vida de la cita mediante un flujo de cierre. | Flujo WF-05 exportado y caso 10 superado | Cumplido |
| 8 | Registrar y consultar información clínica cifrada, con la firma del médico que la escribe y la auditoría de cada lectura. | Flujos WF-07 y WF-08 y sus casos de prueba | Cumplido |
| 9 | Administrar el ciclo de vida de pacientes, médicos y recepcionistas sin borrar su historial, reasignando las citas del médico que deja de atender. | Flujo WF-09 y sus casos de prueba | Cumplido |
| 10 | Verificar la lógica de los nodos Code mediante pruebas unitarias y de integración, y medir su cobertura. | Informe de cobertura en `pruebas/` | En curso |

---

## 4. Alcance del proyecto

### 4.1 Incluido en el alcance

- Registro y validación de solicitudes de cita recibidas vía webhook, con las preferencias que el paciente sí tiene decididas: franja, hora, especialidad o médico.
- Clasificación por tipo de consulta y cálculo automático de prioridad.
- Asignación de médico según disponibilidad por franja, con lista de espera cuando no hay cupo.
- Notificación al paciente mediante correo electrónico local, tanto de la cita confirmada como del ingreso a lista de espera.
- Creación y resguardo del expediente asociado a cada cita.
- Registro de notas clínicas cifradas, firmadas por el médico que las escribe e inmutables.
- Consulta del historial clínico por el médico tratante, con registro de cada lectura en la bitácora.
- Reasignación automática de cupos liberados por cancelación.
- Cierre de la cita por el médico, con resultado atendida o ausente.
- Administración de pacientes, médicos y recepcionistas: alta, desactivación, reactivación y baja definitiva, con reasignación de las citas del médico que deja de atender.
- Reporte semanal de indicadores en formato PDF, enviado al administrador.
- Bitácora de auditoría y registro centralizado de errores.

### 4.2 Excluido explícitamente del alcance

La delimitación negativa forma parte del diseño y se declara para evitar ambigüedad en la evaluación:

- No se desarrolla aplicación móvil. La interfaz web para recepción y médicos queda como trabajo futuro (sección 16); la interacción con el sistema es vía API.
- No se implementa módulo de facturación ni cobros.
- No se implementa firma electrónica avanzada ni certificados digitales. La firma de la nota clínica es una firma de identidad: se deduce del token de cada médico, no de un certificado.
- No se contempla despliegue en producción ni alta disponibilidad.
- El paciente no accede al sistema. Sus solicitudes las registra recepción, y no existe un token de paciente.
- La derivación entre especialidades no la gestiona el sistema: si un médico deriva a un paciente, recepción registra una solicitud nueva.
- No se implementan, por ahora, consultas de citas, pacientes ni lista de espera para recepción. Se planifican como WF-12 (sección 16).

### 4.3 Corrección de una exclusión de versiones anteriores: proveedores externos de correo

Las versiones v1 a v3 de este documento declaraban fuera de alcance «servicios en la nube y proveedores externos de correo». Esa afirmación dejó de ser exacta y se corrigió en la v4.

El sistema emplea dos vías de correo distintas según el destinatario, y la diferencia es deliberada:

| Destinatario | Servidor | Contenido | Sale a Internet |
|---|---|---|:-:|
| Paciente | MailHog local | Fecha, médico y especialidad de su cita; aviso de lista de espera; cambio de médico o cancelación por baja del médico | No |
| Administrador | Gmail con credencial SMTP autenticada | Alertas de error y reporte semanal | Sí |

Los correos dirigidos al paciente contienen datos personales y permanecen confinados al entorno local. Las alertas transportan únicamente el nombre del flujo, el nodo que falló y el identificador del registro de error; el reporte semanal contiene conteos agregados y nombres de médicos activos. Ninguno de los dos incluye información que permita identificar a un paciente, lo que hace admisible su entrega por un servicio externo.

Ni WF-07 ni WF-08 envían correo: la información clínica nunca sale por esa vía.

Los datos operativos y clínicos siguen residiendo exclusivamente en el contenedor de PostgreSQL. La incorporación de Gmail afecta la vía de notificación al administrador, no el almacenamiento ni el procesamiento.

### 4.4 Corrección de una exclusión de la v4: operaciones de consulta

La v4 declaraba que el sistema «no dispone de endpoints de lectura» y que la información se consultaba directamente sobre la base de datos. Esa afirmación dejó de ser cierta con WF-08.

WF-08 es un endpoint de lectura, y además el más delicado del sistema: devuelve el historial clínico descifrado. Por eso se construyó con controles que ningún otro flujo necesitaba. Solo lo usa el rol `medico`. Recibe una cita y no un paciente, de modo que un médico solo ve el historial de pacientes con quienes tiene una cita. Y cada lectura queda registrada en la bitácora, incluso cuando el historial está vacío.

Lo que sigue fuera de alcance es la consulta operativa de recepción: citas del día, pacientes y lista de espera. Esa información se consulta por ahora sobre la base, y se planifica como WF-12.

---

## 5. Arquitectura de la solución

La solución se compone de cuatro contenedores Docker sobre la red interna que Compose crea para el proyecto. Tres publican sus puertos exclusivamente en la interfaz de bucle local `127.0.0.1` y el cuarto no publica ninguno, de modo que ningún servicio queda accesible desde otros equipos de la red: esto constituye en sí mismo una medida de reducción de superficie de exposición.

| Contenedor | Imagen | Rol en el sistema | Puerto publicado |
|---|---|---|:-:|
| **sigac-n8n** | `docker.n8n.io/n8nio/n8n:latest` (v2.33.6) | Motor de orquestación de los flujos de trabajo | 127.0.0.1:5678 |
| **sigac-postgres** | `postgres:16-alpine` | Persistencia de datos operativos, clínicos, auditoría y errores | 127.0.0.1:5433 |
| **sigac-mailhog** | `mailhog/mailhog:latest` | Servidor SMTP local para notificaciones al paciente | 127.0.0.1:8025 |
| **sigac-gotenberg** | `gotenberg/gotenberg:8` | Conversión de HTML a PDF para el reporte semanal | Ninguno |

Gotenberg no publica puerto alguno porque solo lo consume n8n desde la red interna. Exponerlo al anfitrión no aportaría nada y ampliaría la superficie de exposición sin motivo.

> **Captura 1 — Contenedores en ejecución.** Salida de `docker compose ps` mostrando los cuatro servicios activos y sus puertos publicados en `127.0.0.1`.

### 5.1 Flujo de datos entre componentes

```
  Cliente HTTP (curl / Insomnia)
        │  POST /webhook/{cita, cancelar, cerrar, nota, historial, admin}
        │  + token en la cabecera x-sigac-token
        ▼
  ┌──────────────────────────────────────────────┐
  │  sigac-n8n  :5678   (WF-00 … WF-09)          │
  └──┬───────────┬───────────┬────────────┬──────┘
     │ SQL       │ SMTP      │ HTTP       │ SMTP
     ▼           ▼           ▼            ▼
  postgres    mailhog    gotenberg    Gmail (externo)
  (12 tablas) :8025      (PDF)        alertas y reporte

  Red interna de Docker creada por Compose
```

### 5.2 Direcciones de acceso

| Dirección | Función | Rol autorizado |
|---|---|:-:|
| `http://localhost:5678` | Editor de n8n | — |
| `http://localhost:5678/webhook/cita` | Ingesta de solicitudes (WF-01) | recepcion |
| `http://localhost:5678/webhook/cancelar` | Cancelación y reasignación (WF-04) | recepcion |
| `http://localhost:5678/webhook/cerrar` | Cierre de cita (WF-05) | medico |
| `http://localhost:5678/webhook/nota` | Registro de nota clínica (WF-07) | medico |
| `http://localhost:5678/webhook/historial` | Consulta de historial clínico (WF-08) | medico |
| `http://localhost:5678/webhook/admin` | Administración de personas (WF-09) | admin |
| `http://localhost:8025` | Bandeja de MailHog | — |
| `localhost:5433` | PostgreSQL desde herramientas del anfitrión | — |

**Sobre la doble numeración de puertos de PostgreSQL.** Desde el equipo anfitrión la base se alcanza en el puerto `5433`, porque el `5432` ya está ocupado por una instancia de PostgreSQL instalada en Windows. Desde la red interna de Docker, en cambio, n8n se conecta al host `postgres` en el puerto `5432`, que es el puerto nativo del contenedor. La publicación externa no altera el puerto interno.

### 5.3 Decisiones de arquitectura relevantes

**Volúmenes nombrados en lugar de bind mounts.** Los datos de PostgreSQL se almacenan en un volumen gestionado por Docker y no en una ruta del sistema de archivos de Windows. Los bind mounts sobre DrvFs en WSL no reproducen correctamente el modelo de permisos que exige PostgreSQL, lo que provoca fallos de arranque en bucle del contenedor.

La única excepción es la carpeta `reportes/`, montada como bind mount para que los PDF generados por WF-06 queden accesibles desde el anfitrión. Ahí no hay riesgo: n8n escribe archivos sueltos, no una base que exija permisos POSIX estrictos.

**Habilitación explícita del módulo crypto.** El nodo Code de n8n restringe por defecto la carga de módulos nativos de Node.js. Para implementar el cifrado AES-256-GCM, los hashes SHA-256 y la generación de tokens aleatorios se declara la variable `NODE_FUNCTION_ALLOW_BUILTIN=crypto` en la definición del servicio.

**Acceso a variables de entorno desde los nodos Code.** La variable `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` habilita la lectura de `$env` dentro de los nodos Code, necesaria para que la clave de cifrado se lea del entorno y no quede escrita en el flujo.

**Restricción del acceso a archivos.** La variable `N8N_RESTRICT_FILE_ACCESS_TO=/reportes` limita la lectura y escritura de los nodos de archivo a esa única ruta. Se discute en la sección 8.6, porque sustituyó a una configuración más permisiva que constituía un riesgo.

**Separación del correo saliente.** MailHog captura las notificaciones al paciente sin entregarlas a destinatarios reales, lo que permite evidenciarlas durante las pruebas sin exponer datos personales. Las alertas al administrador y el reporte semanal salen por una credencial SMTP autenticada de Gmail, porque su destinatario es una persona real y su contenido no incluye información de pacientes.

---

## 6. Modelo de datos

El esquema consta de doce tablas agrupadas en tres dominios: control de acceso, datos operativos y trazabilidad. Diez forman parte del diseño de agosto; `nota_clinica` y `recepcionista` se incorporaron en octubre, junto con columnas nuevas en cinco de las tablas originales.

| Tabla | Dominio | Campos principales |
|---|:-:|---|
| **usuario_api** | Acceso | `id`, `rol`, `token_hash`, `activo`, `id_medico`, `id_recepcionista`, `creado_en` |
| **paciente** | Operativo | `id`, `dpi_cifrado`, `dpi_huella`, `nombre`, `apellido`, `telefono_cifrado`, `fecha_nacimiento`, `correo`, `activo`, `baja_en` |
| **medico** | Operativo | `id`, `nombre`, `especialidad`, `colegiado`, `activo`, `baja_en` |
| **recepcionista** | Operativo | `id`, `nombre`, `activo`, `baja_en`, `creado_en` |
| **disponibilidad** | Operativo | `id`, `id_medico`, `dia_semana`, `hora_inicio`, `hora_fin`, `cupos` |
| **solicitud_cita** | Operativo | `id`, `id_paciente`, `tipo_consulta`, `motivo`, `prioridad`, `estado`, `fecha_preferida`, `franja_preferida`, `hora_solicitada`, `especialidad_solicitada`, `id_medico_solicitado` |
| **cita** | Operativo | `id`, `id_solicitud`, `id_paciente`, `id_medico`, `fecha_hora`, `estado`, `notificada` |
| **expediente** | Operativo | `id`, `id_paciente`, `id_cita`, `diagnostico_cifrado`, `indicaciones_cifrado`, `creado_por` |
| **nota_clinica** | Operativo | `id`, `id_expediente`, `id_paciente`, `id_cita`, `id_medico`, `diagnostico_cifrado`, `indicaciones_cifrado`, `creado_en` |
| **lista_espera** | Operativo | `id`, `id_solicitud`, `prioridad`, `posicion`, `atendida`, `notificada`, `creado_en` |
| **bitacora_auditoria** | Trazabilidad | `id`, `tabla_afectada`, `id_registro`, `accion`, `rol`, `datos_enmascarados`, `hash_anterior`, `hash_actual` |
| **log_errores** | Trazabilidad | `id`, `workflow`, `nodo`, `mensaje`, `payload_enmascarado`, `severidad`, `creado_en` |

> **Captura 2 — Esquema desplegado.** Listado de las doce tablas en pgAdmin o mediante consulta a `information_schema`.

### 6.1 Estados definidos

| Entidad | Estado inicial | Estados posteriores | Qué flujo los produce |
|---|---|---|---|
| **solicitud_cita** | `pendiente` | `asignada` · `en_espera` · `rechazada` | WF-02 y WF-04 |
| **cita** | `confirmada` | `atendida` · `cancelada` · `ausente` | WF-04, WF-05 y WF-09 |
| **paciente**, **medico**, **recepcionista** | activo | inactivo · baja | WF-09 |

Las personas tienen tres estados, representados con dos columnas:

| Estado | `activo` | `baja_en` | ¿Reversible? |
|---|:-:|:-:|:-:|
| Activo | `true` | nulo | — |
| Inactivo (suspendido o desactivado) | `false` | nulo | Sí |
| Baja | `false` | fecha de la baja | No |

La baja es lógica y no un borrado: la persona deja de operar, pero su historial se conserva. La sección 13 justifica la decisión.

### 6.2 Restricciones de integridad

Las reglas de negocio se declaran en la base de datos y no únicamente en los flujos, de modo que ninguna vía de entrada pueda eludirlas.

| Restricción | Tabla | Qué impide |
|---|---|---|
| `uqcita_medico_horario` | `cita` | Dos citas vigentes del mismo médico a la misma hora (índice parcial: excluye las canceladas) |
| `ckcita_estado` | `cita` | Estados distintos de confirmada, atendida, cancelada o ausente |
| `ckdisp_horas` | `disponibilidad` | Hora de fin anterior a la de inicio |
| `ckusuario_rol` | `usuario_api` | Roles distintos de `recepcion`, `medico` o `admin` |
| `ckusuario_medico` | `usuario_api` | Un `id_medico` en un token que no es de médico |
| `ckusuario_recepcionista` | `usuario_api` | Un `id_recepcionista` en un token que no es de recepción |
| `uqusuario_medico_activo` | `usuario_api` | Dos tokens activos para el mismo médico |
| `uqusuario_recepcionista_activo` | `usuario_api` | Dos tokens activos para la misma recepcionista |
| `cksol_prioridad` | `solicitud_cita` | Prioridad fuera del rango 1 a 5 |
| `cksol_franja` | `solicitud_cita` | Franja distinta de mañana, tarde o indiferente |
| `fksol_medico_solicitado` | `solicitud_cita` | Pedir un médico que no existe |
| `ckpaciente_baja`, `ckmedico_baja`, `ckrecepcionista_baja` | Personas | Una persona dada de baja que siga activa |
| `unique` sobre `dpi_huella` | `paciente` | Registro duplicado del mismo paciente |
| `unique` sobre `id_cita` | `expediente` | Doble expediente para una misma cita |
| `unique` sobre `colegiado` | `medico` | Dos médicos con el mismo número de colegiado |

Dos reglas no están declaradas en la base, y se dejan así de forma consciente: que una nota clínica no se modifique y que una baja no se revierta. Ambas requerirían un trigger. Las garantiza el hecho de que ningún flujo ejecuta la operación que las violaría, y se documentan como decisión en la sección 13.

### 6.3 El campo `dpi_huella`

Este campo no formaba parte del diseño original y se incorporó al implementar el cifrado. El algoritmo AES-GCM emplea un vector de inicialización aleatorio, de modo que dos cifrados del mismo DPI producen textos distintos. Esa propiedad es deseable desde el punto de vista criptográfico, pero impide buscar un paciente por su DPI o detectar duplicados sin descifrar toda la tabla.

La solución es almacenar junto al valor cifrado una huella SHA-256 determinista con restricción de unicidad. La huella permite localizar y deduplicar sin revelar el dato, y el valor cifrado permite recuperarlo cuando es legítimamente necesario.

### 6.4 Campos con protección criptográfica

Seis campos se cifran con AES-256-GCM: `dpi_cifrado` y `telefono_cifrado` en `paciente`, `diagnostico_cifrado` e `indicaciones_cifrado` en `nota_clinica`, y los dos campos homónimos de `expediente`. La clave reside en variable de entorno y no se escribe en el flujo ni en el repositorio.

Los dos campos de `expediente` quedan nulos de forma permanente. El diseño original guardaba el contenido clínico en el propio expediente, una sola vez por cita; el modelo evolucionó hacia varias notas por paciente, cada una firmada por su médico. Los campos se conservan declarados en lugar de eliminarse, porque explican la historia del diseño: `expediente` es el registro de que el expediente se abrió, y `nota_clinica` es su contenido.

**Coexistencia de dos formatos.** Los registros de `paciente` creados antes de implementar el cifrado conservan un valor SHA-256 de 64 caracteres, mientras que los posteriores almacenan el formato `iv:textoCifrado:etiqueta`. Los primeros no son descifrables, por tratarse de un hash y no de un cifrado. Se documenta la situación en lugar de ocultarla, y no se depuran los registros antiguos por ser datos de prueba sin valor operativo.

### 6.5 Evolución del esquema

Los archivos SQL conservan el diseño de agosto en la parte superior y agregan al final un bloque de **cambios y alteraciones posteriores**. Lo nuevo no se integra arriba, para que el historial del diseño quede legible: lo de arriba es lo que se pensó en agosto, y lo de abajo es lo que el análisis por roles hizo evidente en octubre.

| Cambio | Archivo | Contenido | Motivo |
|:-:|---|---|---|
| 1 | `01_schema.sql` | Preferencias del paciente en `solicitud_cita`: franja, hora, especialidad y médico | El sistema asignaba siempre el primer cupo de la mañana, aunque el paciente solo pudiera asistir por la tarde |
| 2 | `01_schema.sql` | Tabla `nota_clinica` | El expediente se abría vacío y nunca se escribía |
| 3 | `01_schema.sql` | `lista_espera.notificada` | El paciente sin cupo no sabía que estaba en espera |
| 4 | `01_schema.sql` | `usuario_api.id_medico` y un solo token activo por médico | Con un token compartido, el sistema sabía que escribió un médico, pero no cuál |
| 5 | `01_schema.sql` | `baja_en` en paciente y médico, tabla `recepcionista` y `usuario_api.id_recepcionista` | Administración de personas sin borrar historial |
| 1 | `02_datos_prueba.sql` | Médicos 4 y 5, y Ginecología | Más de un médico por especialidad para probar la carga |
| 2 | `02_datos_prueba.sql` | Horario partido y miércoles reducido | Horario real de la clínica |
| 3 | `02_datos_prueba.sql` | Un token por médico; el token genérico se desactiva | Consecuencia del cambio 4 del esquema |
| 4 | `02_datos_prueba.sql` | La recepcionista vinculada al token de recepción | Consecuencia del cambio 5 del esquema |

### 6.6 Médicos y horario estándar

| id | Nombre | Especialidad |
|:-:|---|---|
| 1 | Ana Lucia Morales Chub | Medicina General |
| 2 | Carlos Enrique Coc Ical | Pediatria |
| 3 | Silvia Beatriz Cu Pop | Medicina Interna |
| 4 | Luis Fernando Caal Xol | Medicina General |
| 5 | Marta Elena Tzub Quej | Ginecologia |

Todos atienden con el mismo horario, que WF-09 asigna también a cada médico nuevo:

| Días | Mañana (08:00–12:00) | Tarde (13:30–17:00) |
|---|:-:|:-:|
| Lunes, martes, jueves y viernes | 8 cupos | 7 cupos |
| Miércoles | 2 cupos | 2 cupos |

Durante las pruebas de WF-09 se dio de alta a un sexto médico, de Pediatría, para probar la reasignación de citas entre médicos de la misma especialidad. Ese médico quedó dado de baja al terminar las pruebas.

---

## 7. Flujos de trabajo (workflows)

La guía exige un mínimo de tres flujos: ingesta, procesamiento y salida. SIGAC tiene diez flujos implementados y publicados.

| Flujo | Propósito | Nodos | Disparo | Estado |
|---|---|:-:|---|:-:|
| **WF-00** | Manejo centralizado de errores | 3 | Error Trigger | Publicado |
| **WF-01** | Ingesta de solicitudes | 18 | `POST /webhook/cita` | Publicado |
| **WF-02** | Clasificación y asignación | 10 | Cada 5 minutos | Publicado |
| **WF-03** | Notificación, expediente y aviso de espera | 7 | Cada 5 minutos | Publicado |
| **WF-04** | Reasignación de cupos liberados | 13 | `POST /webhook/cancelar` | Publicado |
| **WF-05** | Cierre de cita | 10 | `POST /webhook/cerrar` | Publicado |
| **WF-06** | Reporte semanal de indicadores en PDF | 8 | Domingos 23:00 | Publicado |
| **WF-07** | Registro de nota clínica | 18 | `POST /webhook/nota` | Publicado |
| **WF-08** | Consulta de historial clínico | 18 | `POST /webhook/historial` | Publicado |
| **WF-09** | Administración de personas | 38 | `POST /webhook/admin` | Publicado |

Todos los flujos tienen a WF-00 como *Error Workflow*. Todos los que responden por webhook usan el mismo formato de respuesta: `codigo`, `estado` y `mensaje`, más los datos propios de cada operación.

### WF-00 · Manejador centralizado de errores

Captura cualquier excepción producida en los demás flujos, la registra de forma enmascarada y alerta al administrador por correo real.

```
Error Trigger
  → Registra error           Postgres → log_errores, severidad alta
  → Alerta al administrador  Send Email hacia Gmail
```

Centralizar la captura evita duplicar la lógica en cada flujo y garantiza un formato uniforme de registro. Por ser el último recurso del sistema, es también el nodo que menos puede fallar: el defecto de la sección 12.22 lo afectaba precisamente a él.

### WF-01 · Ingesta de solicitudes

Recibe la solicitud de cita, autentica al emisor, verifica su rol, valida los datos contra el catálogo de médicos activos, cifra los campos sensibles y persiste el registro con su entrada de auditoría.

```
Webhook (POST /webhook/cita)
  → Hash del token           Code
  → Verifica token           Postgres
  → ¿Token válido?           If
        false → Rechazo 401  Code
        true  → ¿Rol autorizado?   If
                  false → Rechazo 403  Code
                  true  → Lee medicos activos   Postgres
                            → Valida datos       Code
                            → ¿Datos válidos?    If
                                  false → Rechazo 400  Code
                                  true  → Cifra datos sensibles  Code
                                            → Guarda solicitud      Postgres
                                            → ¿Paciente habilitado? If
                                                  false → Rechazo 409  Code
                                                  true  → Registra bitácora  Postgres
                                                            → Registro exitoso  Code
  → Respuesta                Respond to Webhook
```

El token nunca se compara en claro: se calcula su SHA-256 y se contrasta contra el hash almacenado.

`Valida datos` revisa el DPI (trece dígitos), el teléfono (ocho dígitos, iniciando entre 2 y 8), el formato del correo, la fecha preferida (una fecha que exista en el calendario y no sea pasada), la fecha de nacimiento (que exista, no sea futura ni anterior a 1900), el tipo de consulta dentro de una lista cerrada, los campos obligatorios y la longitud del motivo. Valida además las preferencias del paciente: la franja, que la hora caiga dentro de una franja real y coincida con la franja pedida, y que el médico y la especialidad pedidos existan entre los médicos activos y sean coherentes entre sí. Los errores se acumulan en un arreglo para devolverlos todos en una sola respuesta, en lugar de uno por intento. Los datos siguen al siguiente nodo ya recortados, los mismos valores que se validaron.

`Guarda solicitud` crea al paciente o reutiliza el existente por su huella de DPI, y en la misma sentencia inserta la solicitud. Si el paciente existe pero está inactivo o dado de baja, la sentencia no inserta nada y el flujo responde 409.

### WF-02 · Clasificación y asignación

Procesa periódicamente las solicitudes pendientes, calcula su prioridad y les asigna médico y horario, o las coloca en lista de espera si no hay cupo disponible.

```
Schedule Trigger (cada 5 min)
  → Lee pendientes       Postgres
  → Clasifica consulta   Switch: urgencia / control / general
  → Calcula prioridad    Code
  → Busca cupo           Postgres
  → Reparte cupos        Code
  → ¿Hay cupo?           If
      true  → Crea cita                  Postgres
      false → Ingresa a lista de espera  Postgres
  → Une resultados       Merge
```

`Busca cupo` devuelve, por cada médico activo y cada franja del día pedido, los cupos, las citas ocupadas y la lista de horas ya tomadas, en hora de Guatemala. Los médicos inactivos quedan fuera desde la consulta.

`Reparte cupos` aplica las preferencias del paciente: el médico pedido o, si no pidió médico, los de la especialidad pedida, y sin especialidad, Medicina General. Filtra por franja y por la hora exacta si la pidió, elige al médico con menos carga y asigna el primer hueco de treinta minutos libre.

**Por qué el reparto se resuelve en un nodo Code y no en SQL.** Todos los elementos del lote se evalúan antes de que se inserte ninguna cita, de modo que una consulta de disponibilidad devolvería el mismo recuento para todos y los asignaría al mismo horario. `Reparte cupos` mantiene el conteo en memoria durante el lote, evitando la colisión.

### WF-03 · Notificación, expediente y aviso de espera

Informa al paciente de su cita confirmada y abre el expediente asociado. En una segunda rama, avisa al paciente que quedó en lista de espera.

```
Schedule Trigger (cada 5 min)
  ├→ Lee citas sin notificar    → Notifica al paciente       → Marca y abre expediente
  └→ Lee espera sin notificar   → Notifica lista de espera   → Marca espera notificada
```

Los correos van a MailHog e incluyen únicamente fecha, médico y especialidad, o el aviso de espera. No transportan DPI, teléfono ni diagnóstico: es una aplicación deliberada del principio de minimización de datos.

La segunda rama resolvió una situación concreta: el paciente sin cupo colgaba el teléfono creyendo que tenía cita, y solo se enteraba si alguien cancelaba.

> **Captura 3 — Notificación recibida.** Correo en MailHog con la fecha en formato local, sin datos identificativos ni clínicos.

### WF-04 · Reasignación de cupos liberados

Al cancelarse una cita, libera el cupo y lo ofrece al siguiente paciente en lista de espera según prioridad y antigüedad.

```
Webhook (POST /webhook/cancelar)
  → Hash del token       Code
  → Verifica token       Postgres
  → ¿Rol autorizado?     If
        false → Rechazo 401   Code
        true  → Cancela cita  Postgres
                  → ¿Se canceló?   If
                        false → Rechazo 404   Code
                        true  → Siguiente en espera  Postgres
                                  → ¿Hay candidato?  If
                                        true  → Reasigna cupo  Postgres
                                                  → Reasignación exitosa  Code
                                        false → Cancelado sin reasignar  Code
  → Respuesta            Respond to Webhook
```

**Decisión de diseño: se reutiliza el médico y el horario de la cita cancelada.** El cupo liberado corresponde a una franja concreta que ya se sabe disponible, de modo que reasignarla evita recalcular disponibilidad y elimina por completo el riesgo de traslape.

La cita nueva se crea con `notificada = false` y WF-03 la recoge en su siguiente ejecución programada. Se prefirió así para mantener un único punto de envío de notificaciones y evitar el acoplamiento entre flujos. Un `id_cita` que no sea entero positivo se convierte en el centinela `0`, de modo que la consulta no encuentra nada y el flujo responde 404.

### WF-05 · Cierre de cita

Permite al médico registrar el resultado de una cita ya celebrada, marcándola como atendida o ausente.

```
Webhook (POST /webhook/cerrar)
  → Hash del token       Code
  → Verifica token       Postgres
  → ¿Rol autorizado?     If
        false → Rechazo 401   Code
        true  → Cierra cita   Postgres
                  → ¿Se cerró?   If
                        false → Rechazo 404      Code
                        true  → Cierre exitoso   Code
  → Respuesta            Respond to Webhook
```

La consulta de cierre valida tres condiciones simultáneas: que la cita esté `confirmada`, que su fecha y hora ya hayan transcurrido, y que el resultado enviado sea uno de los dos valores admitidos. Si cualquiera falla, no se modifica ningún registro y el flujo responde 404.

**A diferencia de la cancelación, el cierre no libera el horario.** La consulta ocurrió o el paciente no se presentó, pero el cupo se consumió igualmente. Por eso el estado `ausente` permanece dentro del índice de unicidad descrito en la sección 12.1, mientras que `cancelada` queda fuera.

### WF-06 · Reporte semanal de indicadores

Genera automáticamente un informe agregado en PDF, lo guarda en disco y lo envía al administrador.

```
Schedule Trigger (domingo 23:00)
  → Reune indicadores    Postgres
  → Carga por medico     Postgres
  → Compone el reporte   Code → HTML
  → Genera el PDF        HTTP Request hacia Gotenberg
  → Nombra el archivo    Code
  → Guarda el PDF        Read/Write Files → /reportes
  → Envia el reporte     Send Email hacia Gmail con adjunto
```

El documento separa dos bloques de indicadores: la actividad de los últimos siete días y los totales acumulados del sistema. La distinción es necesaria porque la base registra la fecha de creación de cada cita, pero no la fecha en que cambia de estado. No existe información suficiente para determinar cuántas citas fueron atendidas o canceladas dentro de una semana concreta, de modo que presentar esos totales como semanales habría sido incorrecto. El propio pie del documento declara la limitación.

La semana se numera según la norma ISO, y el archivo se nombra `semana_AAAA-SS.pdf`. El reporte contiene exclusivamente conteos y nombres de médicos activos, sin ningún dato de paciente, lo que permite entregarlo por correo externo.

> **Captura 11 — Reporte generado.** PDF del reporte semanal con las secciones de actividad y acumulados.

### WF-07 · Registro de nota clínica

Permite al médico registrar el diagnóstico y las indicaciones de una consulta, cifrados y firmados con su identidad.

```
Webhook (POST /webhook/nota)
  → Hash del token        Code
  → Verifica token        Postgres → rol e id_medico
  → ¿Token válido?        If  ─false→ Rechazo 401
  → ¿Es médico?           If  ─false→ Rechazo 403
  → Valida datos          Code
  → ¿Datos válidos?       If  ─false→ Rechazo 400
  → Busca la cita         Postgres
  → ¿Cita válida?         If  ─false→ Rechazo 404
  → Cifra la nota         Code
  → Guarda nota           Postgres
  → Registra bitácora     Postgres
  → Nota registrada       Code
  → Respuesta             Respond to Webhook
```

El cuerpo de la petición contiene `id_cita`, `diagnostico` e `indicaciones`, estas últimas opcionales. **El médico que firma no viene en el cuerpo: sale del token.** Así nadie puede escribir una nota a nombre de otro médico, aunque conozca el formato de la petición.

`Busca la cita` exige que la cita sea del médico que llama, que tenga expediente abierto y que esté atendida o confirmada con la hora ya pasada. No se escribe un diagnóstico antes de la consulta, ni sobre el paciente de otro médico.

La nota es inmutable: el flujo solo inserta, y ningún flujo del sistema ejecuta `update` ni `delete` sobre `nota_clinica`. Un diagnóstico no se corrige: se agrega otro que lo matiza o lo contradice, y ambos quedan, igual que en un expediente real.

### WF-08 · Consulta de historial clínico

Devuelve al médico el historial clínico de un paciente, descifrado y en orden cronológico, y deja constancia de la lectura.

```
Webhook (POST /webhook/historial)
  → Hash del token → Verifica token → ¿Token válido? → ¿Es médico?
  → Valida datos → ¿Datos válidos? → Busca la cita → ¿Cita válida?
  → Lee notas            Postgres
  → Descifra             Code
  → Registra consulta    Postgres → bitácora, acción select
  → Historial listo      Code
  → Respuesta            Respond to Webhook
```

El cuerpo contiene solo `id_cita`, no `id_paciente`. El paciente se deduce de una cita propia del médico, confirmada o atendida, de modo que un médico solo puede leer el historial de pacientes con quienes tiene o tuvo una cita. Devuelve las diez notas más recientes, cada una con el médico que la firmó, su especialidad y la fecha en hora local.

Es el primer flujo que descifra datos y el primero que audita una lectura. La lectura se registra aunque el historial esté vacío, porque lo que se audita es el acceso y no el resultado.

### WF-09 · Administración de personas

Permite al administrador dar de alta, desactivar, reactivar y dar de baja a recepcionistas, pacientes y médicos. Es el flujo más grande del sistema, y se construyó en cinco bloques probados por separado.

```
Webhook (POST /webhook/admin)
  → Hash del token → Verifica token → ¿Token válido? ─false→ Rechazo 401
  → ¿Es admin? ─false→ Rechazo 403
  → Valida datos → ¿Datos válidos? ─false→ Rechazo 400
  → Ruta (Switch, ocho salidas)
      recepcionista_agregar    → Genera token → Agrega recepcionista → Recepcionista agregada
      recepcionista_estado     → Cambia estado recepcionista → Estado recepcionista
      recepcionista_reactivar  → Genera token nuevo → Reactiva recepcionista → Recepcionista reactivada
      paciente_estado          → Cambia estado paciente → Estado paciente
      paciente_reactivar       → Reactiva paciente → Paciente reactivado
      medico_agregar           → Genera token medico → Agrega medico → Medico agregado
      medico_reactivar         → Genera token medico nuevo → Reactiva medico → Medico reactivado
      medico_estado            → Lee situacion del medico → Reparte reemplazos → ¿Se puede aplicar?
                                     false → Rechazo estado medico
                                     true  → Aplica cambio de medico
                                               ├→ Medico desactivado
                                               └→ Prepara correos → Envia correo
  → Respuesta              Respond to Webhook
```

El cuerpo de la petición lleva siempre `accion` y `entidad`, y los demás campos según la combinación:

| Acción | Entidades | Campos | Respuesta exitosa |
|---|---|---|:-:|
| `agregar` | médico, recepcionista | `nombre`; el médico además `especialidad` y `colegiado` | 201 con el token |
| `desactivar` | las tres | `id` | 200 |
| `dar_baja` | las tres | `id` | 200 |
| `reactivar` | las tres | `id` | 200; médico y recepcionista con token nuevo |

Los rechazos propios del flujo son 404 cuando la persona no existe, y 409 en cuatro casos: el colegiado ya existe, la persona fue dada de baja, la persona ya está activa al reactivarla, o el paciente tiene citas futuras o solicitudes en curso.

**Una sola sentencia por operación.** Cada operación que escribe —la persona, su token, sus citas y su eslabón en la bitácora— se resuelve en una única sentencia SQL con expresiones `with`. PostgreSQL ejecuta una sentencia completa o no ejecuta nada, de modo que no puede quedar, por ejemplo, un token activo sin su registro en la bitácora. En los demás flujos la escritura y la bitácora son dos nodos; aquí no, porque un cambio de identidad sin rastro es justo lo que la auditoría debe impedir.

**El token se devuelve una sola vez.** Al agregar o reactivar a un médico o recepcionista, `Genera token` crea 32 bytes aleatorios y su huella. A la base solo llega la huella; el token en claro viaja una vez, en la respuesta, y el flujo no guarda ejecuciones exitosas (capa 7).

**La reasignación de citas del médico que deja de atender.** Es la ruta más compleja, y se separa en tres pasos:

1. `Lee situacion del medico` reúne en una sola lectura al médico, sus citas futuras confirmadas y los candidatos a recibirlas: médicos activos de su especialidad o de Medicina General, con su horario semanal y las horas que ya tienen ocupadas en esas fechas.
2. `Reparte reemplazos` decide en memoria, cita por cita, a qué médico pasa conservando la fecha y la hora, o si se cancela porque nadie puede atenderla. Busca primero en la misma especialidad y después en Medicina General, y entre varios candidatos elige al de menor carga ese día. Cada asignación se anota en memoria, para que dos citas del mismo día no excedan el cupo del mismo médico.
3. `Aplica cambio de medico` ejecuta el plan completo en una sola sentencia: reasigna, cancela, quita al médico como preferencia de las solicitudes que lo pedían, lo desactiva junto con sus tokens y registra un eslabón que resume todo.

De `Aplica cambio de medico` salen dos ramas independientes. Una arma la respuesta al administrador; la otra envía un correo a cada paciente afectado: «su cita sigue en pie, ahora con otro médico», o «su cita ya no está disponible; llame a la clínica». Si el médico no tenía citas, la rama de correos no recibe nada y no se ejecuta, sin dejar al administrador sin respuesta.

> **Captura 13 — Reasignación por baja de un médico.** Respuesta de WF-09 con los conteos y bandeja de MailHog con los avisos de cambio de médico y de cancelación.

### 7.1 Inventario de tipos de nodo utilizados

La guía exige un mínimo de seis tipos de nodo distintos. La implementación emplea doce.

| Categoría | Nodos |
|---|---|
| **Disparadores** | Webhook, Schedule Trigger, Error Trigger |
| **Lógica y control** | If, Switch, Merge |
| **Transformación** | Code |
| **Integración y salida** | Postgres, Send Email, Respond to Webhook, HTTP Request, Read/Write Files |

### 7.2 Configuraciones de nodo que resultaron determinantes

Seis ajustes de n8n no son evidentes y condicionan el comportamiento de los flujos. Se documentan porque su omisión produce fallos silenciosos.

| Ajuste | Dónde se aplica | Qué ocurre sin él |
|---|---|---|
| **Query Batching: Independent** | Nodos Postgres que insertan en lote | Una transacción única revierte todo el lote si un solo elemento falla |
| **Always Output Data** | Consultas que pueden no devolver filas y alimentan un IF | El flujo se interrumpe y el webhook queda sin respuesta |
| **Ausencia de Always Output Data** | Consultas que alimentan directamente una acción | Se envía un elemento vacío a la acción, que falla sin causa real |
| **Valores centinela en los parámetros** | Consultas parametrizadas cuyo valor puede venir vacío | n8n no envía el parámetro y PostgreSQL rechaza la consulta |
| **Parámetros como lista** | Consultas que reciben texto libre | n8n parte el texto en cada coma y corre los parámetros siguientes |
| **Ramas paralelas para efectos secundarios** | Correos que dependen de una operación con respuesta | Si la lista de correos sale vacía, la cadena se corta y el webhook no responde |

El tercer caso es la contracara del segundo y produjo el defecto de la sección 12.2. El cuarto apareció al parametrizar las consultas (sección 12.6), y el quinto es su consecuencia menos visible (sección 12.22).

---

## 8. Ciberseguridad

La guía establece la ciberseguridad como eje obligatorio y la rúbrica técnica le asigna tres puntos, evaluando tres elementos: validación de entradas, control de acceso y cifrado de información sensible. SIGAC implementa diez capas que cubren los tres elementos y agregan trazabilidad verificable. Todas están implementadas y verificadas por casos de prueba.

| Capa | Control implementado | Evidencia |
|:-:|---|---|
| 1 | Gestión de secretos: todas las credenciales residen en variables de entorno o en el almacén cifrado de n8n. El archivo `.env` se excluye del control de versiones y se versiona únicamente `.env.example` con marcadores. | El repositorio no contiene `.env` |
| 2 | Autenticación por token: cada petición transporta un token en la cabecera HTTP, cuyo SHA-256 se compara contra el hash almacenado en `usuario_api`. | 401 en todos los flujos con webhook |
| 2b | Autorización por rol: `recepcion` registra y cancela citas; `medico` cierra citas, escribe notas y consulta historiales; `admin` administra personas. | 403 en WF-01, WF-07, WF-08 y WF-09 |
| 2c | Identidad de la persona en el token: cada médico y cada recepcionista tiene su propio token. La firma de la nota clínica sale del token y no puede falsificarse desde la petición. | Médico 1 rechazado y médico 2 aceptado sobre la misma cita |
| 3 | Cifrado en reposo con AES-256-GCM de DPI, teléfono, diagnóstico e indicaciones. La clave reside en variable de entorno. | Valores `iv:texto:etiqueta` en la base; descifrado en WF-08 |
| 4 | Bitácora de auditoría encadenada por hash SHA-256, que registra altas, cambios, lecturas y operaciones de administración. | El verificador detecta una cadena alterada |
| 4b | Auditoría de lectura: cada consulta del historial clínico queda registrada, incluso si no devuelve notas. | Registros `select` en la bitácora |
| 5 | Validación estricta de entradas, contraste contra el catálogo de médicos activos y enmascaramiento del DPI en respuestas y registros. | 400 con el detalle de cada campo |
| 6 | Consultas parametrizadas en todos los nodos Postgres que reciben valores, con formato de lista en los que reciben texto libre. | Apellido con apóstrofe y textos con comas guardados íntegros |
| 7 | Historial de n8n sin datos sensibles: WF-01, WF-07, WF-08 y WF-09 no guardan ejecuciones exitosas ni manuales. | La pestaña Executions queda vacía tras una consulta |

### 8.1 La bitácora encadenada

Cada registro de auditoría almacena el hash del registro anterior, formando una cadena verificable:

```
hash_actual = SHA-256(hash_anterior || tabla_afectada || id_registro)
```

El primer registro es el génesis y su `hash_anterior` se compone de sesenta y cuatro ceros, porque no existe un eslabón previo con el cual encadenar. La alteración directa de cualquier registro en la base rompe la correspondencia con el siguiente y queda detectada.

La comprobación se ejecuta con `./scripts/verificar.sh`, que recorre la cadena completa con `scripts/verificar_cadena.js` y reporta si está íntegra o rota. Al cerrar las pruebas de esta versión, la cadena tenía 92 registros íntegros.

**Un eslabón por operación.** Como el hash de cada eslabón depende del anterior, una misma sentencia no puede insertar varios eslabones encadenados entre sí. Las operaciones de WF-09 que afectan a muchos registros —por ejemplo, dar de baja a un médico y reasignar sus siete citas— registran un solo eslabón que resume la operación completa, con los identificadores de las citas reasignadas y canceladas.

> **Captura 4 — Integridad de la bitácora.** Salida del verificador antes y después de alterar manualmente un registro.

### 8.2 Consultas parametrizadas

Los treinta y tres nodos Postgres que reciben valores emplean *Query Parameters* con marcadores `$1`, `$2` en lugar de interpolar las expresiones dentro de la cadena SQL. La consulta y los datos viajan por caminos distintos, de modo que el motor nunca interpreta un dato como instrucción.

| Flujo | Nodos parametrizados | Con formato de lista |
|---|:-:|:-:|
| WF-00 | 1 | 1 |
| WF-01 | 3 | 1 |
| WF-02 | 3 | 0 |
| WF-03 | 2 | 0 |
| WF-04 | 4 | 0 |
| WF-05 | 2 | 0 |
| WF-06 | 0 — sus consultas no reciben valores externos | — |
| WF-07 | 4 | 1 |
| WF-08 | 4 | 0 |
| WF-09 | 10 | 9 |

**Dos formatos de parámetros.** n8n acepta los parámetros como texto separado por comas, `{{ $json.a }}, {{ $json.b }}`, o como una lista en una sola expresión, `{{ [ $json.a, $json.b ] }}`. En el primer formato, n8n une los valores en un texto y después lo corta en cada coma, incluidas las que vienen dentro de un dato. Por eso los nodos que reciben texto libre —un nombre, un motivo, un mensaje de error— usan la lista. Los que solo reciben identificadores, fechas, horas, números o hashes, que no pueden contener comas, conservan el formato original. La sección 12.22 documenta cómo se descubrió.

La sección 12.5 documenta cómo se demostró que la interpolación era explotable antes de la parametrización.

### 8.3 Otras decisiones de seguridad

- **Mensajes de rechazo genéricos.** La respuesta 401 no distingue entre token ausente, inexistente o desactivado, para no facilitar la enumeración de credenciales válidas.
- **El mismo 404 para una cita inexistente y una cita ajena.** WF-07 y WF-08 no revelan si una cita existe cuando pertenece a otro médico.
- **Publicación restringida a `127.0.0.1`.** Ningún servicio queda alcanzable desde otros equipos de la red, y Gotenberg ni siquiera publica puerto.
- **Enmascaramiento del DPI** antes de devolverlo en la respuesta o registrarlo en la bitácora, con el formato `*********0101`.
- **Minimización de datos en el correo:** las notificaciones al paciente no transportan datos identificativos ni clínicos, y no salen del entorno local. Ningún flujo envía información clínica por correo.
- **Datos personales fuera de la bitácora:** las operaciones sobre pacientes registran su identificador, nunca su nombre.
- **Custodia de la credencial SMTP de Gmail.** El nodo Send Email no admite expresiones en el campo de contraseña, de modo que la contraseña de aplicación reside en el almacén interno de n8n, cifrada con `N8N_ENCRYPTION_KEY`. Pasarla como variable de entorno la expondría en `docker inspect` y en `printenv` dentro del contenedor, de modo que el almacén es la ubicación más segura disponible.
- **Tokens nunca visibles en la terminal.** Las pruebas que devuelven un token lo enmascaran antes de mostrarlo, y la rotación de un token de uso diario lo escribe directamente en el `.env` sin imprimirlo (sección 8.4, incidente 3).

### 8.4 Incidentes de seguridad ocurridos durante el desarrollo

Se documentan tres exposiciones de credenciales ocurridas en el propio proceso de construcción, por su valor formativo.

**Incidente 1 — Clave de cifrado de n8n en `.env.example`.** El proceso que generaba la plantilla a partir del `.env` empleaba una expresión regular que no contemplaba dígitos en el nombre de la variable. `N8N_ENCRYPTION_KEY` contiene un `8`, de modo que no fue reconocida y conservó su valor real. Se corrigió la expresión, se rotó la clave y se reinició el historial de Git, que aún no tenía publicaciones.

**Incidente 2 — Tokens de rol en el historial de Git.** El archivo `02_datos_prueba.sql`, guardado desde pgAdmin, contenía los tokens en claro dentro de la función `sha256()`. Alcanzó un commit ya publicado. Se generaron tokens nuevos y se actualizaron sus hashes en `usuario_api`. Pero la rotación insertó los tokens nuevos sin desactivar los viejos, y los tokens publicados siguieron funcionando hasta que una revisión posterior lo detectó (sección 12.9).

**Incidente 3 — Tokens de prueba visibles en la salida de la terminal.** Las respuestas de WF-09 al agregar o reactivar a una persona incluyen su token en claro, por diseño: es la única vez que se muestra. Durante las pruebas, esa salida se compartió tres veces sin ocultar el token: el de una recepcionista de prueba y dos del médico de prueba. En los tres casos se trató el token como comprometido: la recepcionista fue dada de baja por el propio flujo, y el médico fue desactivado y reactivado con un token nuevo.

Dos de esas desactivaciones se hicieron a mano desde pgAdmin, porque la ruta de WF-09 para desactivar médicos aún no estaba construida. Esos dos cambios **no quedaron registrados en la bitácora**. Se declaran aquí como lo que son: las únicas modificaciones de identidad del sistema sin eslabón de auditoría.

La respuesta de fondo fue cambiar el método, no pedir más cuidado. Desde ese momento, toda prueba que devuelve un token lo reemplaza por `(oculto)` con `sed` antes de mostrarlo, y la rotación del token de un médico en uso extrae el token de la respuesta y lo escribe en el `.env` sin que llegue a la pantalla.

**Lección adoptada.** Un secreto que llegó al historial o a una conversación se considera comprometido de forma permanente: borrarlo no revoca nada, porque quien lo vio ya lo tiene. Y crear un token nuevo tampoco basta: deja de estar comprometido solo cuando el viejo se **revoca**. Como medida preventiva, los archivos versionados llevan marcadores del tipo `PEGA_AQUI_TOKEN`, y antes de cada commit se ejecuta una búsqueda de cadenas hexadecimales de sesenta y cuatro caracteres.

### 8.5 Revisión de seguridad del sistema terminado

Con el sistema de la v4 completo se ejecutó una revisión sobre el repositorio y su historial, buscando los valores reales de los secretos del `.env` en los archivos versionados y en todos los commits.

| Comprobación | Resultado |
|---|---|
| Secretos en archivos versionados | Cero coincidencias |
| Secretos en el historial completo de Git | Cero coincidencias |
| `.env` excluido por `.gitignore` | Correcto |

La revisión no encontró fugas, pero sí identificó tres puntos de mejora, todos resueltos: el acceso a archivos internos de n8n (sección 8.6), la parametrización de las consultas (sección 12.5) y la custodia de la credencial de Gmail (sección 8.3). Una revisión posterior encontró que los tokens del incidente 2 seguían activos y que el historial de ejecuciones guardaba datos en claro (secciones 12.9 y 12.10).

### 8.6 Acceso de los nodos a los archivos internos de n8n

La variable `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` se había declarado con valor `false` al implementar la escritura del reporte en disco. Ese valor desactiva una protección de n8n y permite que los nodos lean los archivos internos del propio motor, incluido el que contiene su llave de cifrado.

No llegó a ser explotada —ningún nodo del sistema lee archivos salvo el que escribe el PDF— pero constituía una exposición innecesaria. Se eliminó la variable, con lo que recupera su valor por defecto y la protección queda activa. `N8N_RESTRICT_FILE_ACCESS_TO=/reportes` sigue permitiendo la escritura del reporte, que es la única operación de archivo que el sistema necesita.

Tras el cambio se ejecutó WF-06 para confirmar que el PDF seguía generándose, evitando introducir una regresión al corregir un riesgo.

### 8.7 Riesgos residuales aceptados

Dos riesgos se conocen, se evaluaron y se aceptan de forma consciente para un entorno académico.

**Ejecuciones fallidas con datos en claro.** Los flujos que manejan datos sensibles no guardan sus ejecuciones exitosas, pero sí las fallidas, porque son las que permiten diagnosticar un error. Una ejecución fallida de WF-01, WF-07, WF-08 o WF-09 puede contener un DPI, un diagnóstico o un token en claro. En un despliegue real se desactivarían también, dejando el diagnóstico solo en `log_errores`, o se usaría la función de enmascaramiento de n8n, que es de pago.

**Dos eslabones simultáneos.** Cada eslabón toma como anterior el último registro de la bitácora. Si dos operaciones escribieran en la bitácora en el mismo instante, ambas podrían tomar el mismo eslabón anterior, y el verificador reportaría la cadena como rota aunque nadie la hubiera alterado. El error sería una falsa alarma, no una alteración silenciosa: la cadena nunca se declara íntegra cuando no lo está. Con el volumen de una clínica pequeña es improbable. En un despliegue real se resolvería con un bloqueo sobre la bitácora antes de leer el último eslabón.

### 8.8 Correspondencia con la rúbrica

| Elemento exigido por la rúbrica | Capas que lo cubren |
|---|:-:|
| Credenciales protegidas mediante variables de entorno | 1 |
| Validación de entradas | 5 y 6 |
| Control de acceso | 2, 2b y 2c |
| Cifrado de información sensible | 3 y 7 |
| Registro de auditoría (criterio de manejo de datos) | 4 y 4b |

---

## 9. Manejo de errores

El manejo de errores se centraliza en WF-00, que actúa como flujo alterno de todos los demás.

| Tipo de error | Tratamiento | Respuesta |
|---|---|:-:|
| **Token ausente o inválido** | Rechazo controlado con mensaje genérico | HTTP 401 |
| **Rol sin autorización para la operación** | Rechazo controlado | HTTP 403 (401 en WF-04 y WF-05) |
| **Datos que no superan la validación** | Respuesta con el detalle de todos los campos rechazados | HTTP 400 |
| **Cita o persona inexistente, ajena, no cancelable o no cerrable** | Rechazo controlado | HTTP 404 |
| **Conflicto con el estado actual** | Paciente inactivo que pide cita, persona ya dada de baja o ya activa, colegiado repetido, paciente con citas o solicitudes en curso | HTTP 409 |
| **Base de datos no disponible** | Captura por Error Trigger, severidad alta, notificación al administrador | — |
| **Excepción no controlada en un nodo** | Captura por Error Trigger, payload enmascarado | — |

Los cinco primeros son rechazos previstos por el diseño y se resuelven dentro del propio flujo. Los dos últimos son fallos no previstos y activan WF-00.

El mecanismo se verificó en condiciones reales con fallos de distinta naturaleza: una detención deliberada de PostgreSQL durante la ejecución (CP-08), un fallo de WF-04 al violarse una restricción de unicidad (sección 12.1), un desbordamiento de longitud en el campo `motivo`, el error de sintaxis provocado por un apóstrofe antes de parametrizar las consultas (sección 12.5) y la violación de una llave foránea por un médico inexistente (sección 12.18). En todos los casos el error quedó registrado en `log_errores` y generó la alerta correspondiente.

Varios de los defectos corregidos en esta versión consistieron precisamente en convertir fallos que terminaban en WF-00 en rechazos previstos: un `id_cita` no numérico, un resultado de cierre inválido o un médico inexistente ahora responden 400 o 404 en lugar de provocar una excepción. Un error de datos del usuario no debe llegar al manejador de excepciones: WF-00 queda para lo que de verdad es inesperado.

> **Captura 5 — Alerta de error.** Correo de alerta al administrador recibido en Gmail, con el identificador de registro coincidente con el de `log_errores`.

---

## 10. Consistencia de la información

La ficha del Avance 2 solicita evidenciar que la información se mantiene consistente después de varias operaciones. El diseño lo garantiza mediante mecanismos declarados en la base de datos, no en la lógica de los flujos.

| Mecanismo | Qué evita |
|---|---|
| `on conflict (dpi_huella) do update` en `paciente` | Duplicar el paciente al enviar varias solicitudes con el mismo DPI |
| `on conflict (id_cita) do nothing` en `expediente` | Duplicar el expediente al reejecutar WF-03 sobre la misma cita |
| `uqcita_medico_horario` en `cita` | Doble asignación del mismo médico a la misma hora |
| Filtro `notificada = false` en WF-03 | Reenviar la notificación en cada ejecución del temporizador |
| `uqusuario_medico_activo` y `uqusuario_recepcionista_activo` | Que una persona quede con dos tokens activos a la vez |
| Una sola sentencia por operación en WF-09 | Que una operación quede aplicada a medias |

**Comprobaciones ejecutadas.**

1. Se enviaron dos solicitudes con el mismo DPI. El resultado fue un único paciente con dos solicitudes asociadas, en lugar de dos pacientes duplicados. La comprobación se repitió tras parametrizar las consultas, con idéntico resultado.
2. Se forzó el reprocesamiento de una cita ya notificada, devolviendo su campo `notificada` a `false`. WF-03 la procesó de nuevo y envió la notificación, pero la consulta de conteo sobre `expediente` devolvió **1**, no 2. El expediente no se duplicó pese a ejecutarse dos veces la misma operación.
3. Se desactivó a un médico con siete citas futuras. Las siete pasaron a otro médico de la misma especialidad en una sola sentencia, con la misma fecha y hora, y la bitácora registró un único eslabón que las enumera. Si en ese momento otro flujo hubiera ocupado uno de esos horarios, el índice `uqcita_medico_horario` habría rechazado la sentencia completa: o se reasignan todas, o ninguna.
4. Se rechazó una solicitud de un paciente inactivo y se contaron después sus solicitudes: seguía teniendo una sola. El rechazo no dejó ninguna fila a medias.

La segunda y la tercera comprobación son las más relevantes, porque demuestran que la consistencia no depende de que los flujos se ejecuten una sola vez ni de que nadie más escriba al mismo tiempo, sino de reglas de la base que se cumplen siempre.

> **Captura 6 — Consistencia verificada.** Consulta de verificación mostrando un único expediente tras reprocesar la misma cita.

---

## 11. Plan de pruebas

Las pruebas se organizaron por fases, al ritmo en que se construyó el sistema. Todos los casos de esta sección fueron ejecutados y superados. Los comandos de cada uno están en el README.

### 11.1 Casos originales

Se definieron doce casos que combinan entradas válidas e inválidas, conforme a la evidencia solicitada en la sección 3 de la guía.

| # | Escenario | Entrada | Resultado obtenido | Estado |
|:-:|---|---|---|:-:|
| 1 | Solicitud válida | Datos completos con token de recepción | HTTP 201 con `id_solicitud` y hash de auditoría | Superado |
| 2 | Autenticación ausente | Petición sin token | HTTP 401 con mensaje genérico | Superado |
| 3 | Autorización insuficiente | Token de rol médico creando una cita | HTTP 403 | Superado |
| 4 | Validación de formato | DPI de 10 dígitos | HTTP 400 con detalle del campo | Superado |
| 5 | Validación de negocio | Fecha preferida en el pasado | HTTP 400 con detalle del campo | Superado |
| 6 | Sin disponibilidad | Solicitudes por encima de los cupos del día | Solicitudes en `lista_espera`, estado `en_espera` | Superado |
| 7 | Reasignación | Cancelación de una cita confirmada | Cupo reasignado al siguiente en espera | Superado |
| 8 | Caída de dependencia | Fallo de conexión a la base durante la ejecución | WF-00 registró el error y notificó al administrador | Superado |
| 9 | Integridad de auditoría | Alteración manual de un registro | El verificador detectó la ruptura de la cadena | Superado |
| 10 | Cierre de cita | Token de médico, cita vencida y confirmada | HTTP 200 con el resultado registrado | Superado |
| 11 | Reporte semanal | Ejecución manual de WF-06 | PDF generado en disco y recibido por correo | Superado |
| 12 | Inyección SQL | Apellido con apóstrofe | HTTP 201; el valor se almacena íntegro | Superado |

#### Detalle del caso 7 — Reasignación

Por ser el que más componentes involucra, se documenta su ejecución completa.

**Estado previo.** La cita 53 del médico 1 estaba confirmada para el 21 de septiembre a las 09:30. Dos solicitudes permanecían en `lista_espera` con prioridad 5 y fecha preferida del mismo día.

**Operación.** Petición `POST /webhook/cancelar` con el token de recepción y el identificador de la cita.

**Respuesta obtenida.**

```json
{
  "codigo": 200,
  "estado": "reasignado",
  "mensaje": "Cita cancelada y cupo reasignado",
  "id_cita_cancelada": 53,
  "id_cita_nueva": 2393,
  "id_solicitud_beneficiada": 13
}
```

**Verificación en la base.**

| Comprobación | Resultado |
|---|:-:|
| Cita 53 en estado `cancelada` | Correcto |
| Cita 2393 creada con el mismo médico y el mismo horario | Correcto |
| Entrada de `lista_espera` marcada como `atendida` | Correcto |
| Solicitud 13 de `en_espera` a `asignada` | Correcto |
| Solicitud 14 sin alterar | Correcto |

El último punto importa tanto como los anteriores: se liberó un solo cupo y se reasignó un solo cupo. Que la cita nueva conserve el mismo médico y el mismo horario que la cancelada es además la verificación de que los parámetros de la consulta llegaron a su columna correcta, algo que no puede comprobarse leyendo la consulta.

La cita nueva quedó con `notificada = false` y WF-03 la notificó en su siguiente ejecución, completando la cadena cancelación → reasignación → notificación → expediente sin intervención manual.

> **Captura 7 — Caso 7.** Respuesta del endpoint de cancelación con los tres identificadores.
>
> **Captura 8 — Caso 7, verificación.** Consultas mostrando el estado de las citas, la lista de espera y las solicitudes tras la reasignación.

#### Detalle del caso 10 — Cierre de cita

Se verifican los tres caminos del flujo en una sola secuencia:

| Petición | Resultado esperado | Obtenido |
|---|:-:|:-:|
| Token de médico, cita vencida y confirmada | 200 | 200 |
| Token de recepción sobre la misma operación | 401 | 401 |
| Token de médico, cita de fecha futura | 404 | 404 |

El segundo caso demuestra que la autorización distingue entre roles válidos: recepción es un emisor legítimo del sistema, pero no está facultado para cerrar citas. El tercero demuestra que la validación temporal opera dentro de la propia consulta y no en la lógica del flujo.

> **Captura 12 — Caso 10.** Los tres caminos del flujo de cierre con sus códigos de respuesta.

### 11.2 Preferencias del paciente

| Escenario | Resultado |
|---|---|
| Solicitud sin preferencias | 201; el sistema decide médico y horario |
| Solicitud con las cuatro preferencias | 201; se respetan franja, hora, especialidad y médico |
| Hora en el horario de almuerzo | 400 |
| Franja de la tarde con una hora de la mañana | 400 |
| Franja inexistente | 400 |
| Médico y hora pedidos | Cita con ese médico a esa hora |
| Sin médico pedido | Cita con el médico de menor carga |
| Doce solicitudes para un miércoles (cuatro cupos por médico) | 8 citas y 4 solicitudes en lista de espera |

### 11.3 Registro de nota clínica (WF-07)

| Prueba | Resultado |
|---|:-:|
| Sin token | 401 |
| Token de recepción | 403 |
| Sin diagnóstico | 400 |
| Cita inexistente | 404 |
| Médico 1 sobre su propia cita | 201 |
| Médico 1 sobre una cita del médico 2 | 404 |
| Médico 2 sobre su cita, sin indicaciones | 201, con indicaciones nulas |
| Cita futura todavía no atendida | 404 |
| Diagnóstico en la base | Cifrado, no legible |
| Bitácora | Un `insert` sobre `nota_clinica` por cada nota |

### 11.4 Consulta de historial clínico (WF-08)

| Prueba | Resultado |
|---|:-:|
| Sin token / token de recepción / sin `id_cita` | 401 / 403 / 400 |
| Médico 1 desde una cita del médico 2 | 404 |
| Médico 1 desde su cita con nota | 200, nota descifrada con médico, especialidad y fecha local |
| Médico 1 desde su cita sin notas | 200, lista vacía |
| Bitácora | Un `select` por consulta, incluida la que no devolvió notas |
| Historial de ejecuciones de n8n tras la consulta | Vacío |

### 11.5 Catálogo de médicos y estado del paciente en WF-01

| Escenario | Resultado |
|---|---|
| Solicitud sin preferencias | 201 |
| Especialidad escrita `pediatría`, en minúsculas y con tilde | 201; guardada como `Pediatria`, la escritura de la base |
| Médico inexistente (`id_medico_solicitado: 99`) | 400; antes violaba la llave foránea y terminaba en WF-00 |
| Especialidad sin médicos (`Cardiologia`) | 400 |
| Médico de Pediatría pedido con la especialidad Ginecología | 400 |
| Médico existente pero inactivo | 400 |
| Paciente inactivo que vuelve a pedir cita | 409; ninguna solicitud insertada |
| El mismo paciente, reactivado | 201 |
| Paciente nuevo | 201 |

### 11.6 Textos con comas

| Flujo | Entrada | Resultado |
|---|---|---|
| WF-09 | Recepcionista `Pop Choc, Ana Lucia`, antes de la corrección | Nombre guardado como `Pop Choc` y `Ana Lucia` guardado como huella del token: defecto 12.22 confirmado |
| WF-09 | Recepcionista `Coc Caal, Maria Jose`, después de la corrección | Nombre íntegro, huella válida y token funcional |
| WF-01 | Nombre `Ana, Maria`, apellido `Coc, Caal` y motivo `dolor de cabeza, fiebre y tos`, sin preferencias | Los tres íntegros; preferencias nulas |
| WF-01 | Nombre, apellido y motivo con comas, con franja, hora y especialidad | Todos íntegros, cada uno en su columna |
| WF-07 | Diagnóstico e indicaciones con comas, y una segunda nota sin indicaciones | Ambas notas guardadas; la segunda con indicaciones nulas |

### 11.7 Administración de personas (WF-09)

**Entrada común.**

| Escenario | Resultado |
|---|:-:|
| Sin token | 401 |
| Token de recepción | 403 |
| Cuerpo vacío | 400, con dos errores: acción y entidad |
| Agregar un paciente | 400: los pacientes se registran con su primera solicitud |
| `id` no numérico | 400 |
| Médico sin especialidad ni colegiado | 400, con los dos errores |

**Recepcionista.**

| Escenario | Resultado |
|---|:-:|
| Agregar | 201, con un token que WF-01 acepta |
| Desactivar | 200, un token desactivado |
| Dar de baja | 200, un token desactivado |
| Dar de baja otra vez | 409 |
| Reactivar a una recepcionista inactiva | 200, con token nuevo; el anterior sigue inactivo |
| Reactivar a una recepcionista activa | 409 |
| Reactivar a una recepcionista dada de baja | 409 |
| Recepcionista inexistente | 404 |

**Paciente.**

| Escenario | Resultado |
|---|:-:|
| Desactivar a un paciente sin nada en curso | 200 |
| Dar de baja a un paciente sin nada en curso | 200 |
| Dar de baja otra vez | 409 |
| Paciente con una cita futura | 409, con `citas_futuras: 1` |
| Paciente con citas y solicitudes en curso | 409, con `citas_futuras: 4` y `solicitudes_pendientes: 7` |
| Reactivar a un paciente inactivo | 200 |
| Reactivar a un paciente activo o dado de baja | 409 |
| Paciente inexistente | 404 |

**Médico.**

| Escenario | Resultado |
|---|:-:|
| Agregar un médico con nombre con coma | 201, con diez franjas de horario |
| Agregar con un colegiado repetido | 409 |
| Reactivar a un médico inactivo | 200, con token nuevo |
| Reactivar a un médico activo | 409 |
| Reactivar a un médico dado de baja | 409 |
| Médico inexistente | 404 |

### 11.8 Detalle de la reasignación por desactivación y baja de un médico

Se documenta completa por ser la operación más compleja del sistema.

**Primera operación: desactivar al médico 2.** El médico 2, de Pediatría, tenía siete citas futuras confirmadas, todas un martes: seis por la mañana y una por la tarde. El médico de prueba, también pediatra, tenía el mismo horario y ninguna cita.

```json
{
  "codigo": 200,
  "estado": "actualizado",
  "mensaje": "Medico 2 desactivado",
  "citas_reasignadas": 7,
  "citas_canceladas": 0,
  "preferencias_liberadas": 0,
  "tokens_desactivados": 1
}
```

Las siete citas pasaron al otro pediatra con la misma fecha y hora, y los siete pacientes recibieron el aviso de cambio de médico en MailHog.

**Reactivación con rotación del token.** El médico 2 se reactivó y su token nuevo se escribió directamente en el `.env`, sin mostrarse. WF-07 lo aceptó (400 por el cuerpo vacío, no 401). Sus siete citas no volvieron: se quedaron con el médico que las recibió.

**Segunda operación: dar de baja al médico de prueba.** Antes de ejecutarla se agregaron dos registros de prueba: una cita para un sábado, día en que nadie atiende, y una solicitud en lista de espera que pedía expresamente a ese médico.

```json
{
  "codigo": 200,
  "estado": "actualizado",
  "mensaje": "Medico 6 dado de baja",
  "citas_reasignadas": 7,
  "citas_canceladas": 1,
  "preferencias_liberadas": 1,
  "tokens_desactivados": 1
}
```

| Comprobación | Resultado |
|:--|:-:|
| Las siete citas del martes, de vuelta con el médico 2 | Correcto |
| La cita del sábado, cancelada, con aviso de «llame a la clínica» | Correcto |
| La solicitud en espera, sin preferencia de médico | Correcto |
| El médico de prueba, dado de baja y sin tokens activos | Correcto |
| Repetir la baja, y reactivarlo | 409 en ambos casos |
| Cadena de la bitácora | Íntegra |

Las dos operaciones recorrieron las tres ramas de la reasignación: reasignar, cancelar y liberar preferencias.

> **Captura 14 — Correo de cancelación.** Aviso al paciente de que su cita no está disponible y debe llamar a la clínica.

### 11.9 Reproducción de las pruebas

Los casos de entrada se ejecutan sobre cada endpoint variando un único elemento de la petición, lo que permite aislar el control que cada uno verifica. Existe una colección de Insomnia con las peticiones y un entorno base donde se completan los tokens tras importarla; los tokens no se versionan.

El README documenta cada caso con su comando ejecutable. Las fechas de los ejemplos se calculan en el momento de ejecución y no se escriben de forma literal, porque la validación rechaza fechas pasadas y cualquier valor fijo caduca. Las pruebas de WF-09 que devuelven un token lo ocultan antes de mostrarlo.

**Casos destinados al video de demostración:** el caso 1 corresponde al escenario normal y el caso 8 al escenario con error, ambos exigidos explícitamente por la guía. El recorrido entre médicos —una nota escrita un día y el historial consultado otro— y la baja de un médico con reasignación de sus citas se proponen como demostración adicional.

### 11.10 Pruebas unitarias y de integración

> **Sección en construcción.** Se completará con las pruebas unitarias de los nodos Code ejecutadas con Jest, las pruebas de integración y el informe de cobertura.

La preparación de estas pruebas ya produjo un resultado: al recopilar en un solo archivo el código de los nodos Code para probarlo, aparecieron los defectos 12.11 a 12.17. La sección 12 lo detalla.

---

## 12. Defectos detectados y corregidos

Durante el desarrollo se detectaron veintidós defectos. Ninguno era visible mientras el sistema no se sometió a las operaciones que los provocan, o mientras el código no se leyó completo, lo que ilustra por qué las pruebas se diseñan sobre escenarios y no sobre funciones aisladas.

| # | Flujo o tabla | Defecto | Cómo se detectó |
|:-:|---|---|---|
| 12.1 | `cita` | La unicidad médico–horario no distinguía citas canceladas | Caso 7 |
| 12.2 | WF-03 | Ejecución en vacío cada cinco minutos | Patrón en `log_errores` |
| 12.3 | WF-03 | Fecha del correo en UTC y formato ISO | Inspección del correo |
| 12.4 | Modelo | Ninguna operación producía `atendida` ni `ausente` | Diseño del reporte |
| 12.5 | Todos | Inyección SQL con un apóstrofe | Apellido `O'Connor` |
| 12.6 | WF-01 | Parámetro vacío tras parametrizar | Prueba sin token |
| 12.7 | WF-01, WF-02 | Nulos enviados como el texto `null` | Solicitudes sin preferencias |
| 12.8 | WF-02 | Preferencias descartadas entre nodos | Asignación que ignoraba la franja |
| 12.9 | `usuario_api` | Tokens del incidente 2 todavía activos | Revisión de los tokens |
| 12.10 | n8n | Historial de ejecuciones con datos en claro | Revisión de Executions |
| 12.11 | WF-01 | DPI con espacios duplicaba al paciente | Recopilación de los nodos Code |
| 12.12 | WF-04, WF-05 | `id_cita` no numérico terminaba en WF-00 | Recopilación de los nodos Code |
| 12.13 | WF-05 | Resultado inválido violaba `ckcita_estado` | Recopilación de los nodos Code |
| 12.14 | WF-01 | Fechas inexistentes pasaban la validación | Recopilación de los nodos Code |
| 12.15 | WF-02 | Cupos contados por día y no por franja | Recopilación de los nodos Code |
| 12.16 | WF-06 | Semana del reporte distinta de la ISO | Recopilación de los nodos Code |
| 12.17 | WF-07, WF-08 | Rechazos sin el campo `estado` | Recopilación de los nodos Code |
| 12.18 | WF-01 | Médico solicitado inexistente terminaba en WF-00 | Análisis para WF-09 |
| 12.19 | WF-01 | Médico solicitado inactivo dejaba la solicitud en espera para siempre | Análisis para WF-09 |
| 12.20 | WF-01 | Cualquier texto se aceptaba como especialidad | Análisis para WF-09 |
| 12.21 | WF-01 | Pacientes inactivos podían seguir pidiendo citas | Análisis para WF-09 |
| 12.22 | WF-00, WF-01, WF-07, WF-09 | Las comas partían los parámetros de texto | Prueba deliberada en WF-09 |

### 12.1 Restricción de unicidad que no distinguía citas canceladas

**Síntoma.** La primera ejecución del caso 7 canceló la cita, pero no reasignó el cupo. El endpoint devolvió HTTP 200 con el cuerpo vacío.

**Causa.** La restricción `uqcita_medico_horario` estaba declarada como `unique (id_medico, fecha_hora)`, sin considerar el estado. Una cita cancelada conserva su fila y, por lo tanto, seguía ocupando su par médico–horario de forma permanente. Cuando WF-04 intentó insertar la cita nueva en ese mismo horario, la inserción violó la restricción, el nodo falló y el flujo se interrumpió antes de alcanzar el nodo de respuesta, lo que explica el cuerpo vacío.

**Diagnóstico.** El registro de `log_errores` lo identificó de forma inequívoca: `duplicate key value violates unique constraint "uqcita_medico_horario"`, en el nodo `Reasigna cupo`.

**Corrección.** Se sustituyó la restricción por un índice único parcial que excluye el estado `cancelada`:

```sql
create unique index uqcita_medico_horario
  on cita (id_medico, fecha_hora)
  where estado <> 'cancelada';
```

**Justificación.** El propósito de la regla es impedir que un médico tenga dos citas *vigentes* a la misma hora. Una cita cancelada no ocupa el cupo: ese es precisamente el significado de cancelar. La restricción original confundía la existencia del registro con la ocupación del horario. El estado `ausente` permanece dentro del índice, porque el paciente no se presentó pero el horario sí se consumió.

Se evaluó una alternativa consistente en reutilizar la fila de la cita cancelada mediante un `update`, y se descartó: habría destruido el rastro de que esa cita perteneció a otra solicitud y de que fue cancelada, lo que contradice el eje de trazabilidad del proyecto.

### 12.2 Ejecución en vacío de WF-03

**Síntoma.** La tabla `log_errores` acumulaba un registro `No recipients defined` cada cinco minutos, con exactitud de reloj. Al momento de detectarlo se habían acumulado ciento setenta registros.

**Causa.** El nodo `Lee citas sin notificar` tenía activada la opción *Always Output Data*. Cuando no había citas pendientes de notificar, el nodo emitía igualmente un elemento vacío, que llegaba al nodo de envío de correo sin destinatario.

**Corrección.** Se desactivó *Always Output Data* en ese nodo. La cadena de WF-03 es lineal y no alimenta ningún IF posterior, de modo que lo correcto es que el flujo se detenga cuando no hay trabajo que hacer.

**Observación metodológica.** El patrón temporal fue lo que permitió descartar una causa de datos: los errores aparecían en ticks regulares y, de forma reveladora, faltaba exactamente el tick en que sí existía una cita por notificar. Ningún paciente carecía de correo electrónico, como se verificó por consulta directa.

Tras la corrección se depuraron los ciento setenta registros espurios y se conservó el error legítimo de la sección 12.1. La tabla dejó de recibir registros nuevos, lo que se comprobó esperando dos ciclos completos del temporizador.

### 12.3 Formato y zona horaria en la notificación

**Síntoma.** El correo al paciente mostraba la fecha como `2026-09-21T14:30:00.000Z`, tanto en el asunto como en el cuerpo.

**Causa.** El valor `timestamptz` devuelto por PostgreSQL se serializaba en formato ISO y en tiempo universal coordinado, sin conversión a la zona horaria local.

**Impacto.** Además de ser ilegible para un destinatario no técnico, la hora mostrada difería seis horas de la real: una cita de las 08:30 aparecía como las 14:30. Un lector podría concluir razonablemente que el sistema asigna horarios incorrectos.

**Corrección.** Se formateó la fecha con la librería de fechas integrada en n8n, aplicando la zona `America/Guatemala`:

```
{{ DateTime.fromISO($json.fecha_hora)
     .setZone('America/Guatemala')
     .toFormat("dd/MM/yyyy 'a las' HH:mm") }}
```

El correo muestra ahora `21/09/2026 a las 08:30`.

> **Captura 9 — Antes y después.** Bandeja de MailHog mostrando simultáneamente la notificación con formato ISO en UTC y la corregida en hora local.

### 12.4 Ciclo de vida de la cita incompleto

**Síntoma.** Al diseñar el reporte de indicadores se advirtió que las consultas sobre citas atendidas y ausentes devolverían cero de forma permanente.

**Causa.** El modelo de datos define cuatro estados para la entidad `cita` —confirmada, atendida, cancelada y ausente— pero ninguna operación automatizada producía los dos últimos. El diagrama de estados declaraba un ciclo de vida que el sistema no completaba.

Es un defecto que la implementación por sí sola no revela: cada flujo hacía correctamente lo suyo, y solo al intentar medir el sistema en conjunto quedó expuesto el hueco.

**Corrección.** Se construyó WF-05, un flujo de cierre que permite al médico marcar una cita como atendida o ausente. Además de completar el ciclo, resolvió una asimetría del modelo de acceso: el rol `medico` estaba definido en la tabla `usuario_api` y se usaba en las pruebas de autorización, pero no disponía de ninguna operación propia. Existía únicamente para ser rechazado.

### 12.5 Inyección SQL demostrada y corregida

**Síntoma.** Una solicitud con el apellido `O'Connor` —entrada perfectamente legítima— devolvió HTTP 200 con el cuerpo vacío en lugar del 201 esperado.

**Causa.** Las consultas de los nodos Postgres interpolaban los valores dentro de la cadena SQL. El apóstrofe del apellido cerró la cadena de texto y PostgreSQL interpretó el resto como instrucción, registrando en `log_errores` el mensaje `Syntax error at line 7 near "Connor"` en el nodo `Guarda solicitud`.

**Alcance del problema.** El defecto tiene dos caras. Desde la seguridad, si un apóstrofe llega al motor sin escapar, un atacante puede cerrar la cadena y escribir SQL propio; la validación previa solo acotaba DPI, teléfono, correo y tipo de consulta, dejando `nombre`, `apellido` y `motivo` como texto libre. Desde el funcionamiento, un paciente apellidado O'Connor, D'Angelo o Ma'at sencillamente no podía registrarse.

**Corrección.** Los catorce nodos Postgres que entonces recibían valores se migraron a *Query Parameters* con marcadores `$1`, `$2`. La consulta y los datos viajan por caminos separados y el motor nunca confunde uno con otro.

**Verificación.** La misma petición que antes fallaba devolvió HTTP 201, y una consulta directa confirmó que el apellido quedó almacenado como `O'Connor`, sin caracteres de escape ni mutilación.

**Nota sobre el diseño de la prueba.** Se eligió deliberadamente un apóstrofe en un apellido y no una carga destructiva. Una sentencia de borrado habría demostrado lo mismo a costa de destruir la tabla de errores, que contiene la evidencia del proyecto. El apellido prueba la vulnerabilidad y además expone un fallo funcional que una carga maliciosa no habría revelado.

### 12.6 Parámetro vacío tras la parametrización

**Síntoma.** Después de parametrizar WF-01, una petición sin token devolvió HTTP 200 con el cuerpo vacío en lugar del 401 esperado. El camino exitoso y el de rol no autorizado seguían funcionando.

**Causa.** El nodo que calcula el hash del token devolvía una cadena vacía cuando no venía cabecera. Con la consulta interpolada eso producía una comparación contra cadena vacía, válida y sin resultados. Con parámetros, el valor vacío hace que n8n no envíe el parámetro, y PostgreSQL rechaza la consulta con `there is no parameter $1`.

**Corrección.** Los nodos que preparan los parámetros devuelven valores centinela en lugar de cadenas vacías: `sin-token` para el hash ausente, `0` para un identificador de cita faltante e `invalido` para un resultado de cierre no admitido. Ninguno puede coincidir con un valor legítimo, de modo que la consulta se ejecuta, no encuentra coincidencias y el flujo responde con el rechazo que corresponde.

**Observación metodológica.** Este defecto lo introdujo una corrección de seguridad, y solo apareció porque se probaron los caminos de rechazo y no únicamente el exitoso. Es el argumento más concreto a favor de verificar siempre las tres respuestas posibles de un endpoint y no solo la que confirma que funciona.

### 12.7 Nulos enviados como el texto «null»

**Síntoma.** Al incorporar las preferencias del paciente, las solicitudes que no traían hora, especialidad o médico fallaban al guardarse.

**Causa.** Con el formato de parámetros separados por comas, n8n convierte en texto el resultado de cada expresión. Un valor nulo llega a PostgreSQL como la palabra `null`, que no es un nulo sino una cadena de cuatro letras: `'null'::time` es una hora inválida.

**Corrección.** Las consultas reciben esos parámetros con `nullif($n, 'null')`, que convierte la palabra en un nulo real. Al pasar los parámetros a formato de lista (sección 12.22), los nodos afectados conservan el mismo contrato, enviando `'null'` de forma explícita cuando el valor falta, para no cambiar dos cosas a la vez.

### 12.8 Preferencias descartadas entre nodos

**Síntoma.** WF-02 asignaba citas sin respetar la franja ni la hora que el paciente había pedido, aunque la solicitud las tenía guardadas.

**Causa.** Un nodo Code devuelve solo el objeto que construye. Los nodos intermedios de WF-02 armaban su salida con los campos que ellos usaban, y los cuatro campos de preferencia se perdían antes de llegar a `Reparte cupos`, que asignaba sin ellos y sin ningún error.

**Corrección.** Los nodos intermedios propagan de forma explícita los campos de preferencia. Es un defecto característico de n8n: los datos no viajan solos por el flujo, viajan los que cada nodo decide devolver.

### 12.9 Tokens comprometidos que seguían activos

**Síntoma.** Una revisión del estado de `usuario_api` mostró más tokens activos de los que debían existir.

**Causa.** La respuesta al incidente 2 generó tokens nuevos e insertó sus huellas, pero no desactivó las filas de los tokens publicados en GitHub. Durante semanas, los tokens comprometidos siguieron abriendo el sistema.

**Corrección.** Se desactivaron las filas de los tokens viejos. La regla de rotación quedó escrita en ese orden: primero desactivar el token anterior y después insertar el nuevo. El esquema la refuerza desde el cambio 4 con índices únicos parciales que impiden que una misma persona tenga dos tokens activos.

**Observación.** Es el defecto de seguridad más grave del proyecto, y su causa no fue técnica sino de procedimiento: la rotación se entendió como «crear un token nuevo», cuando en realidad es «revocar el viejo». La sección 8.4 recoge la lección.

### 12.10 Historial de ejecuciones con datos en claro

**Síntoma.** La pestaña Executions de n8n mostraba, en cada ejecución de WF-01, WF-07 y WF-08, el DPI, el diagnóstico o el historial clínico completos y sin cifrar.

**Causa.** n8n guarda por defecto los datos de entrada y salida de cada nodo en cada ejecución. El cifrado protegía la base de datos, pero el motor de flujos conservaba su propia copia en claro de los mismos datos, en otra base, fuera del alcance de las demás capas.

**Corrección.** Los flujos que manejan datos sensibles se configuraron para no guardar ejecuciones exitosas ni manuales. Se convirtió en la capa 7 de seguridad. WF-09 se creó con esa configuración desde el principio, porque sus respuestas incluyen tokens en claro. Las ejecuciones fallidas sí se guardan, como riesgo residual aceptado (sección 8.7).

### 12.11 a 12.17 · Defectos encontrados al recopilar los nodos Code

Para preparar las pruebas unitarias se reunió en un solo archivo el código de los treinta y seis nodos Code que entonces tenía el sistema. Leídos uno por uno en n8n, todos parecían correctos. Leídos juntos, aparecieron siete inconsistencias entre nodos. Se verificaron leyendo el código, se corrigieron en n8n y se registraron en un mismo commit.

**12.11 · Un DPI con espacios duplicaba al paciente.** `Valida datos` recortaba el DPI para validarlo, pero entregaba al siguiente nodo el valor original. Un DPI con un espacio al final pasaba la validación y generaba en `Cifra datos sensibles` una huella distinta: el `on conflict` no lo reconocía y el mismo paciente quedaba registrado dos veces. **Corrección:** `Valida datos` devuelve los mismos datos que validó, ya recortados. Los datos se limpian donde se validan, no en cada nodo posterior.

**12.12 · Un `id_cita` no numérico terminaba en WF-00.** En WF-04 y WF-05, un identificador como `"abc"` hacía fallar el `::int` de la consulta, y la excepción llegaba al manejador de errores en lugar de responder 404. **Corrección:** el centinela `0` cuando el valor no es un entero positivo. La consulta no encuentra nada y el flujo responde 404.

**12.13 · Un resultado de cierre inválido violaba `ckcita_estado`.** Sobre una cita válida, un resultado no admitido llegaba hasta el `update` con el centinela `invalido`, que la restricción de la tabla rechazaba con una excepción. **Corrección:** el `where` de la consulta exige que el resultado sea `atendida` o `ausente`, de modo que el `update` no encuentra filas y el flujo responde 404.

**12.14 · Fechas inexistentes pasaban la validación.** JavaScript acepta el 30 de febrero y lo convierte en silencio al 2 de marzo; PostgreSQL lo rechaza. La fecha de nacimiento, además, solo se revisaba como presente. **Corrección:** una función `fechaReal` que compara el día, el mes y el año resultantes con los escritos, aplicada a las dos fechas, más límites razonables para la de nacimiento.

**12.15 · Cupos contados por día y no por franja.** `Busca cupo` sumaba los cupos del día completo, de modo que una mañana llena podía seguir recibiendo citas si la tarde tenía espacio, y el minuto calculado automáticamente podía repetir una hora ya ocupada. **Corrección:** `Busca cupo` devuelve los cupos y las horas ocupadas por franja, y `Reparte cupos` asigna el primer hueco realmente libre.

**12.16 · La semana del reporte no era la ISO.** El número de semana se calculaba con una fórmula propia que en 2026 iba desfasada respecto de la norma ISO. **Corrección:** la numeración de Luxon, `weekNumber` y `weekYear`.

**12.17 · Rechazos sin el campo `estado`.** Los ocho rechazos de WF-07 y WF-08 respondían sin `estado: 'rechazado'`, a diferencia del resto de la API. **Corrección:** el mismo formato en todos los rechazos.

**Observación metodológica.** Estos siete defectos no se encontraron ejecutando el sistema, sino leyéndolo de una forma distinta. Es el mismo aprendizaje del curso sobre cobertura: el código puede estar ejecutado por las pruebas y aun así faltarle una regla.

### 12.18 a 12.20 · Validaciones que cada nodo suponía que hacía otro

**Síntoma.** Al analizar qué flujos debían respetar el estado de un médico antes de construir WF-09, se revisó cómo validaba WF-01 al médico y la especialidad pedidos. No los validaba.

**Causa.** El comentario de `Valida datos` afirmaba que la existencia y el estado del médico «los verifica la consulta siguiente», y el comentario del cambio 1 en `01_schema.sql` afirmaba que la especialidad se validaba en WF-01 contra la tabla `medico`. Ninguna de las dos cosas era cierta: después de `Valida datos` no había ninguna consulta que leyera médicos. Cada parte del sistema suponía que otra hacía el trabajo.

Las consecuencias eran tres defectos distintos:

| # | Entrada | Qué pasaba |
|:-:|---|---|
| 12.18 | Un médico inexistente | La llave foránea fallaba en `Guarda solicitud` y el error terminaba en WF-00 |
| 12.19 | Un médico existente pero inactivo | La solicitud se aceptaba y quedaba en lista de espera para siempre, porque WF-02 nunca le encontraba cupo |
| 12.20 | Una especialidad inexistente, como `Cardiologia` | La solicitud se aceptaba y nunca encontraba médico |

**Corrección.** Un nodo nuevo, `Lee medicos activos`, entrega a `Valida datos` el catálogo de médicos activos con su especialidad. `Valida datos` rechaza con 400 un médico inexistente o inactivo, una especialidad sin médicos activos y un médico que no pertenece a la especialidad pedida. Además normaliza la especialidad a la escritura de la base sin importar mayúsculas ni tildes: `pediatría` se guarda como `Pediatria`, que es con lo que compara WF-02.

**Observación.** Un comentario que promete una validación es más peligroso que la falta de comentario, porque detiene la búsqueda de quien lee el código. Los dos comentarios se reemplazaron por la descripción de lo que el código hace realmente.

### 12.21 · Pacientes inactivos que podían seguir pidiendo citas

**Síntoma.** Antes de que existiera la posibilidad de desactivar pacientes, el defecto no podía observarse. Apareció al analizar qué haría WF-01 con un paciente inactivo.

**Causa.** `Guarda solicitud` reutiliza al paciente existente con `on conflict (dpi_huella) do update`, sin mirar si está activo. Un paciente desactivado podía seguir registrando solicitudes.

**Corrección.** El `do update` acepta una condición: `where paciente.activo`. Si el paciente existe pero no está activo, la actualización no ocurre y no devuelve fila; sin paciente, la solicitud tampoco se inserta. Todo ocurre en la misma sentencia. Un nodo If nuevo detecta la salida vacía y responde 409. La prueba confirmó que no quedó ninguna solicitud insertada.

### 12.22 · Las comas partían los parámetros de texto

**Síntoma.** Al probar el alta de una recepcionista en WF-09 con el nombre `Pop Choc, Ana Lucia`, el flujo respondió 201, pero la base guardó como nombre solo `Pop Choc` y, en la columna de la huella del token, el texto `Ana Lucia`. El token entregado nunca habría funcionado.

**Causa.** Con el formato de parámetros separados por comas, n8n resuelve cada expresión, une todo en un solo texto y después lo corta en cada coma, incluidas las que vienen dentro de un dato. El nombre se partió en dos y todos los parámetros siguientes se corrieron un lugar: el segundo trozo del nombre ocupó el lugar de la huella, y la huella real se descartó.

La base lo aceptó porque la columna `token_hash` es `char(64)`, que solo limita la longitud máxima y rellena con espacios lo que falta. Una restricción que exigiera sesenta y cuatro caracteres hexadecimales lo habría rechazado.

**Alcance.** La revisión de los treinta y tres nodos parametrizados encontró cuatro que recibían texto libre:

| Flujo · Nodo | Parámetro expuesto | Consecuencia |
|---|---|---|
| WF-00 · `Registra error` | El mensaje de error | El `insert` en `log_errores` fallaba y el error original se perdía sin registro |
| WF-01 · `Guarda solicitud` | Nombre, apellido y motivo | Un motivo como `dolor de cabeza, fiebre` corría la fecha preferida, la franja y la hora |
| WF-07 · `Guarda nota` | Diagnóstico e indicaciones cifrados | Bajo: el formato del cifrado no lleva comas, pero es el dato más delicado del sistema |
| WF-09 · nodos de alta | Nombres de personas | Persona registrada con datos cortados y token inservible |

El caso más grave era WF-00: los mensajes de error suelen contener comas, y el manejador de errores podía fallar justo al registrar el error que más interesaba.

**Corrección.** Los Query Parameters de esos nodos pasaron a una lista de JavaScript en una sola expresión: `{{ [ $json.a, $json.b ] }}`. n8n recibe la lista ya separada y no corta nada. Donde la consulta esperaba el centinela `'null'`, la lista lo conserva.

**Verificación.** Una segunda recepcionista con coma en el nombre se guardó íntegra, con una huella válida, y su token fue aceptado por WF-01. En WF-01, nombre, apellido y motivo con comas se guardaron cada uno en su columna, con y sin preferencias. En WF-07, dos notas con comas se guardaron íntegras, una de ellas con las indicaciones nulas.

**Observación.** El defecto existía desde la parametrización de la sección 12.5. La corrección de la inyección separó la consulta de los datos, pero la lista de datos se seguía armando a partir de un texto. Durante semanas no se manifestó porque ninguna prueba usaba comas. Se había anotado como sospecha, y se confirmó con una prueba diseñada para eso: un nombre con coma en el primer nodo de texto libre del flujo nuevo.

---

## 13. Decisiones de diseño

Las decisiones siguientes no surgen de un requisito escrito sino del análisis del proceso. Se documentan porque cada una descarta una alternativa razonable.

| Decisión | Justificación |
|---|---|
| **El sistema decide solo lo que el paciente no decidió** | Las cuatro preferencias son opcionales. Su ausencia es lo que indica al sistema que debe decidir él. |
| **Sin especialidad, Medicina General** | Es la puerta de entrada de la clínica. La misma regla se aplica al reasignar las citas de un médico que deja de atender. |
| **La derivación no la gestiona el sistema** | Si un médico deriva a un paciente, recepción registra una solicitud nueva. Automatizarlo exigiría reglas clínicas que no corresponden al sistema. |
| **La nota clínica es inmutable** | Un diagnóstico no se corrige: se agrega otro, y ambos quedan. Es como funciona un expediente real y lo que hace legible el recorrido de un paciente entre médicos. |
| **La firma de la nota sale del token** | Se descartó recibir el médico en la petición, porque permitiría firmar a nombre de otro, y firmar con el médico asignado, porque un médico puede cubrir a otro. |
| **WF-08 recibe una cita, no un paciente** | Un médico solo ve el historial de pacientes con quienes tiene o tuvo una cita. |
| **Se audita el acceso, no el resultado** | La consulta de un historial vacío también se registra. |
| **El mismo 404 para una cita inexistente y una ajena** | No se revela si una cita existe cuando pertenece a otro médico. |
| **Los datos se limpian donde se validan** | El nodo que valida entrega los valores validados, no los originales (sección 12.11). |
| **Centinela y no rama nueva para entradas inválidas en WF-04 y WF-05** | Un valor que no puede coincidir hace que la consulta no encuentre nada y el flujo responda con el rechazo que ya existe. |
| **Las reglas importantes viven también en la base** | Ninguna vía de entrada, ni siquiera una consulta manual, puede saltarse una restricción declarada. |
| **La baja es lógica, no un borrado** | Un paciente con citas tiene expediente y notas inmutables, y la bitácora guarda el identificador de esas filas. Borrarlo rompería las llaves foráneas o dejaría eslabones apuntando a nada. |
| **Tres estados para las personas, con dos columnas** | Se conservó el booleano `activo` y se agregó `baja_en`, en lugar de reemplazarlo por un campo de estado, para no romper los flujos que ya lo leían. |
| **La recepcionista es una persona, no solo un token** | Antes del cambio 5 no había a quién suspender: solo una fila de tokens. Con su tabla, el token identifica a la persona, igual que el del médico. |
| **El paciente solo nace en WF-01** | Es donde se valida y se cifra su DPI. Permitir el alta desde administración crearía una segunda puerta para el mismo dato. |
| **Reactivar entrega siempre un token nuevo** | El token anterior queda inactivo como rastro, igual que en cualquier rotación. |
| **No se reactiva a quien ya está activo** | Darle un token nuevo exigiría apagar el viejo y crear el nuevo en la misma sentencia, y PostgreSQL no garantiza el orden de ejecución de las partes de una sentencia: el índice de un solo token activo podría rechazarla. El camino es desactivar y reactivar, y cada paso queda en la bitácora. |
| **Un paciente con citas o solicitudes en curso no se desactiva** | Recepción debe resolverlas primero; la respuesta 409 informa cuántas tiene de cada tipo. |
| **La cita reasignada conserva su fecha y hora** | El paciente no pierde su horario; solo cambia el médico. |
| **Una cita sin reemplazo se cancela y se avisa al paciente** | Se descartó rechazar la desactivación del médico mientras tuviera citas sin reemplazo, porque bloquearía al administrador sin resolver nada. |
| **Reactivar a un médico no le devuelve sus citas** | Las citas reasignadas ya tienen médico, y los pacientes ya fueron avisados. |
| **Se libera la preferencia de médico en las solicitudes pendientes** | WF-02 nunca les encontraría cupo con un médico inactivo. Se conserva la especialidad pedida. |
| **Una sola sentencia y un solo eslabón por operación de administración** | La atomicidad la garantiza PostgreSQL, no la secuencia de nodos (sección 7, WF-09). |
| **Los correos van en una rama aparte de la respuesta** | Si no hay a quién avisar, la rama no se ejecuta y la respuesta al administrador no depende de ella. |

---

## 14. Estructura del repositorio

```
ProyectoSIGAC/
├── README.md                     Instalación, ejecución, uso y pruebas
├── docker-compose.yml            Orquestación de los cuatro contenedores
├── .env                          Secretos reales — no versionado
├── .env.example                  Plantilla de variables, con marcadores
├── .gitignore                    Excluye .env y artefactos generados
├── sql/
│   ├── 01_schema.sql             Doce tablas: diseño de agosto y cambios 1 a 5
│   └── 02_datos_prueba.sql       Médicos, horario, tokens y cambios 1 a 4
├── workflows/
│   ├── WF-00_errores.json
│   ├── WF-01_ingesta.json
│   ├── WF-02_clasificacion.json
│   ├── WF-03_notificacion.json
│   ├── WF-04_reasignacion.json
│   ├── WF-05_cierre.json
│   ├── WF-06_reporte.json
│   ├── WF-07_nota_clinica.json
│   ├── WF-08_historial_clinico.json
│   └── WF-09_administracion.json
├── scripts/
│   ├── verificar_cadena.js       Validador de la bitácora encadenada
│   └── verificar.sh
├── pruebas/                      Pruebas unitarias e integración con Jest
├── docs/
│   ├── documento-tecnico.md      Este documento
│   └── uml/                      Diagramas .puml y PDF exportado
└── reportes/                     Salida de WF-06, excluida del control de versiones
```

### 14.1 Convenciones adoptadas

**Nombres de archivo.** Prefijo numérico cuando el orden de ejecución importa, guiones bajos en lugar de espacios y ausencia de tildes. Los flujos exportados siguen el patrón `WF-NN_concepto.json`, ya que n8n los descarga con el nombre del flujo y espacios intercalados.

**Archivos SQL.** El diseño original se conserva intacto arriba y los cambios se agregan abajo, cada uno con su motivo (sección 6.5).

**Commits.** Uno por bloque funcional cerrado y probado, con prefijo de gitmoji que identifica su naturaleza y mensaje en español.

**Verificación previa al commit.** Búsqueda de cadenas hexadecimales de sesenta y cuatro caracteres en los archivos versionados, y revisión de `git status` para confirmar que solo entra lo que corresponde. Los flujos exportados contienen legítimamente una cadena de ese tipo: el identificador de instancia de n8n, idéntico en todos ellos.

### 14.2 Control de versiones en tres capas

El proyecto mantiene tres registros de evolución complementarios:

| Capa | Qué registra |
|---|---|
| Historial de Git | Cada bloque funcional cerrado y probado |
| Versiones nombradas en n8n | Cada publicación de un flujo, con nombre y descripción del cambio |
| Control de versiones de este documento | Los cambios de fondo entre entregas |

La segunda capa es propia de n8n 2.x, que separa el borrador del flujo publicado: guardar no basta para que un cambio surta efecto en producción, es necesario publicar, y cada publicación exige nombre de versión y descripción. WF-09, por ejemplo, se publicó una vez por cada bloque y por cada corrección.

> **Captura 10 — Versionado de flujos.** Historial de versiones publicadas de un flujo en n8n.

---

## 15. Estado frente a los requisitos

### 15.1 Mínimos exigidos por la sección 3 de la guía

| # | Requisito | Cómo se cumple |
|:-:|---|---|
| 1 | n8n ejecutándose en entorno local, ideal con Docker | Cuatro contenedores orquestados con Compose |
| 2 | Persistencia local de datos | PostgreSQL 16, doce tablas |
| 3 | Mínimo tres workflows: ingesta, procesamiento y salida | Diez flujos: WF-00 a WF-09 |
| 4 | Al menos seis nodos distintos | Doce tipos de nodo |
| 5 | Manejo de errores: Error Trigger y registro de errores | WF-00, verificado con fallos reales de cinco tipos |
| 6 | Evidencia de pruebas con entradas válidas e inválidas | Sección 11, organizada por fases |
| 7 | Bitácora de ejecución | Cadena de hashes verificable, que registra también lecturas y administración |
| 8 | Ciberseguridad | Diez capas implementadas |

**Los ocho mínimos están cumplidos.**

### 15.2 Ficha de la reunión de Avance 2 (sección 14 de la guía)

| Elemento solicitado | Estado |
|---|---|
| Un proceso automatizado con n8n funcionando | Diez flujos publicados y operativos |
| Evidencia de manejo de errores y validaciones | WF-00, `log_errores` y los rechazos 400, 401, 403, 404 y 409 |
| Evidencia de la medida de ciberseguridad implementada | Diez capas, sección 8 |
| Evidencia de pruebas realizadas | Sección 11 |
| Que la información se mantiene consistente tras varias operaciones | Sección 10, con cuatro comprobaciones ejecutadas |
| Lo que falta por terminar antes de la entrega final | Sección 16 |

---

## 16. Trabajo pendiente

| # | Tarea | Qué aporta |
|:-:|---|---|
| 1 | Pruebas unitarias de los nodos Code con Jest, pruebas de integración e informe de cobertura | Lo pedido en clase; completa la sección 11.10 |
| 2 | Actualizar el README: instalación desde cero con la generación de los tokens, los nuevos endpoints y cómo correr las pruebas | Reproducibilidad, exigida por la rúbrica |
| 3 | Actualizar los diagramas UML de `docs/uml/` | Clases, casos de uso y secuencia con `nota_clinica`, `recepcionista` y WF-07 a WF-09 |
| 4 | Grabar el video de demostración de 5 a 8 minutos | Entregable exigido por la sección 4 de la guía |
| 5 | Añadir `sql/03_verificacion.sql` | Consultas de comprobación reproducibles |

### 16.1 Trabajo futuro: operaciones de recepción

La numeración WF-09 quedó asignada a la administración de personas, de modo que la fase de operaciones de recepción se renumera:

| Flujo | Propósito |
|---|---|
| WF-10 | Consultar huecos libres de una fecha |
| WF-11 | Agendar directo con hora fija |
| WF-12 | Reprogramar fecha y hora, con el mismo médico |
| WF-13 | Consultar citas, pacientes y lista de espera |

La consulta de huecos puede reutilizar la lógica de `Busca cupo`, que ya devuelve las horas ocupadas por franja.

### 16.2 Trabajo futuro: aplicación web

Pantallas de recepción (panel, nueva solicitud, calendario, listado y detalle de citas, reprogramación y lista de espera) y de médico (agenda del día, historial, registro de nota y cierre de cita), consumiendo los mismos endpoints. Existen tres mockups en Figma con la paleta acordada (`#122620`, `#FAF6EC` y `#1F7A5C`).

---

## 17. Correspondencia con la rúbrica técnica

La rúbrica de la sección 11 de la guía asigna quince puntos en modalidad individual.

| Criterio evaluado | Pts. | Elemento que lo cubre |
|---|:-:|---|
| Que el proceso automatizado funcione y resuelva el problema | 4 | Diez flujos operativos y doce tipos de nodo, sobre un mínimo exigido de tres flujos y seis nodos; ciclo completo desde la solicitud hasta el historial clínico, y administración de personas |
| Buen diseño técnico | 3 | Arquitectura en contenedores con publicación restringida, modelo de doce tablas con restricciones declaradas en la base, operaciones atómicas en una sola sentencia y manejo de errores centralizado |
| Ciberseguridad | 3 | Diez capas que cubren validación, control de acceso con identidad por persona, cifrado y auditoría de lectura, con los incidentes del desarrollo documentados y remediados |
| Manejo de errores y de los datos | 2 | WF-00, tabla `log_errores`, bitácora encadenada por hash, baja lógica sin pérdida de historial y consistencia verificada tras operaciones repetidas |
| Documentación clara | 2 | Este documento, con veintidós defectos y veinticuatro decisiones de diseño justificadas, y el README de instalación, uso y pruebas |
| Evidencia y que se pueda reproducir | 1 | Casos de prueba por fase con sus comandos; el entorno completo se levanta con un solo comando |
| **TOTAL** | **15** | |

---

## 18. Control de entregables

Al ser modalidad individual, aplican únicamente los cuatro primeros.

| Entregable | Formato | Estado |
|---|:-:|---|
| Repositorio Git con README, docker-compose, `workflows/` y `docs/` | GitHub | Completo; README por actualizar |
| Documento técnico | Markdown, Word o PDF | Este documento, versión 5 |
| Diagrama de arquitectura y del flujo principal | Imagen o PDF | En `docs/uml/`, por actualizar |
| Video de demostración de 5 a 8 minutos, con presencia en cámara | Enlace de Drive | Pendiente |

---

## 19. Control de versiones del documento

| Versión | Fecha | Cambios principales |
|:-:|---|---|
| v1 | 7 de agosto de 2026 | Versión inicial presentada en el Avance 1. Diseño del sistema, arquitectura propuesta y flujos previstos. |
| v2 | Agosto de 2026 | Ampliación del modelo de datos y de las capas de ciberseguridad. |
| v3 | 18 de septiembre de 2026 | Actualización para el Avance 2. Se corrige el número de flujos (de seis previstos a cinco implementados) y de tipos de nodo (de quince a diez). Se documenta el cifrado AES-256-GCM y la coexistencia con el formato anterior. Se actualiza el plan de pruebas a nueve casos superados. Se incorporan la sección de consistencia y la de defectos corregidos. |
| v4 | 18 de octubre de 2026 | Siete flujos operativos con la incorporación de WF-05 (cierre de cita) y WF-06 (reporte semanal en PDF). Cuarto contenedor, Gotenberg. Doce tipos de nodo. Se corrige la exclusión de alcance relativa a servicios externos de correo. Sexta capa de ciberseguridad: consultas parametrizadas. Revisión de seguridad del sistema terminado, riesgo de acceso a archivos internos de n8n y tres defectos nuevos. El plan de pruebas pasa de nueve a doce casos. |
| **v5** | **23 de octubre de 2026** | Diez flujos con la incorporación de WF-07 (nota clínica), WF-08 (historial clínico) y WF-09 (administración de personas); WF-03 con aviso de lista de espera. Doce tablas con `nota_clinica` y `recepcionista`, y cinco cambios al esquema documentados con su motivo. Preferencias del paciente en la solicitud. Diez capas de seguridad: identidad de la persona en el token, auditoría de lectura e historial de ejecuciones sin datos sensibles. Incidente 3 y riesgos residuales aceptados. Se corrigen la exclusión «sin endpoints de lectura» (4.4) y la afirmación de que la trazabilidad del expediente ya estaba resuelta (2.2). Dieciséis defectos nuevos, de 12.7 a 12.22. Nueva sección de decisiones de diseño. El plan de pruebas se organiza por fases. Fase de operaciones de recepción renumerada a WF-10 a WF-13. |

### 19.1 Nota sobre la evolución del documento

Cada versión de este documento ha corregido afirmaciones de la anterior que el diseño daba por hechas y la implementación no confirmó. La v3 redujo seis flujos a cinco y quince tipos de nodo a diez. La v4 volvió a subir esas cifras porque lo pendiente se construyó, y corrigió la exclusión del correo externo y el riesgo de inyección que se declaraba aceptable.

La v5 corrige tres afirmaciones de naturaleza distinta. Dos son de alcance: que el sistema no tenía endpoints de lectura, y que la trazabilidad del expediente estaba resuelta cuando el expediente se abría vacío. La tercera vive en el propio código: dos comentarios que prometían validaciones que ningún nodo hacía (sección 12.18). Es la misma distancia entre lo que se afirma y lo que se hace, trasladada del documento al código fuente.

Se declaran explícitamente en lugar de sustituirse en silencio, porque la distancia entre lo que un documento afirma y lo que el sistema hace es, en sí misma, un resultado del análisis.
