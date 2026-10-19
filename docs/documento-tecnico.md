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
| **Entregable** | Proyecto Final — Avance 2 (Funcional) |
| **Versión del documento** | v4 |
| **Fecha** | Cobán, Alta Verapaz — 18 de octubre de 2026 |

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
| **Enfoque de ciberseguridad** | Seis capas: credenciales en variables de entorno, autenticación por token, autorización por rol, cifrado AES-256-GCM en reposo, bitácora de auditoría encadenada por hash SHA-256, y validación de entradas con consultas parametrizadas |
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

SIGAC automatiza mediante flujos de trabajo de n8n el ciclo completo de atención: solicitud → autenticación → autorización → validación → registro → clasificación → asignación → notificación → expediente → cierre. El procesamiento y los datos residen íntegramente en contenedores Docker locales, y la ciberseguridad se incorpora como eje transversal del diseño y no como un agregado posterior.

---

## 3. Objetivos

### 3.1 Objetivo general

Diseñar e implementar un sistema automatizado de gestión de citas y expedientes clínicos utilizando n8n sobre una infraestructura local en contenedores, que integre persistencia en PostgreSQL, manejo centralizado de errores y controles de ciberseguridad verificables, concluido y documentado antes de la fecha de entrega del Proyecto Final del curso.

### 3.2 Objetivos específicos

| # | Objetivo específico (SMART) | Verificación | Estado |
|:-:|---|---|:-:|
| 1 | Montar un entorno local reproducible con n8n, PostgreSQL, MailHog y Gotenberg orquestados mediante Docker Compose. | El comando `docker compose up -d` levanta el sistema completo | Cumplido |
| 2 | Implementar los flujos de trabajo que cubran ingesta, procesamiento, salida, reasignación, cierre, reportería y manejo de errores. | Exportación JSON de los flujos en el repositorio | Cumplido — siete flujos |
| 3 | Diseñar un modelo de datos normalizado de diez tablas que soporte los datos operativos, la auditoría y el registro de errores. | Script `01_schema.sql` ejecutado sin errores | Cumplido |
| 4 | Implementar controles de ciberseguridad sobre los datos sensibles gestionados por el sistema. | Casos de prueba 2, 3, 4, 5, 9 y 12 superados | Cumplido — seis capas |
| 5 | Documentar y evidenciar casos de prueba con entradas válidas e inválidas. | Resultados registrados en la sección 11 de este documento | Cumplido — 12 de 12 |
| 6 | Incorporar la generación automática de un reporte semanal de indicadores en PDF. | Flujo WF-06 exportado y reporte generado | Cumplido |
| 7 | Completar el ciclo de vida de la cita mediante un flujo de cierre. | Flujo WF-05 exportado y casos 10 superados | Cumplido |

---

## 4. Alcance del proyecto

### 4.1 Incluido en el alcance

- Registro y validación de solicitudes de cita recibidas vía webhook.
- Clasificación por tipo de consulta y cálculo automático de prioridad.
- Asignación de médico según disponibilidad configurada, con lista de espera cuando no hay cupo.
- Notificación al paciente mediante correo electrónico local.
- Creación y resguardo del expediente asociado a cada cita.
- Reasignación automática de cupos liberados por cancelación.
- Cierre de la cita por el médico, con resultado atendida o ausente.
- Reporte semanal de indicadores en formato PDF, enviado al administrador.
- Bitácora de auditoría y registro centralizado de errores.

### 4.2 Excluido explícitamente del alcance

La delimitación negativa forma parte del diseño y se declara para evitar ambigüedad en la evaluación:

- No se desarrolla aplicación móvil ni interfaz gráfica propia; la interacción es vía API.
- No se implementa módulo de facturación ni cobros.
- No se implementa firma electrónica avanzada ni certificados digitales.
- No se contempla despliegue en producción ni alta disponibilidad.
- No se implementan operaciones de consulta: el sistema registra, clasifica, asigna, notifica, cancela, reasigna y cierra, pero no dispone de endpoints de lectura. La información se consulta directamente sobre la base de datos.

### 4.3 Corrección de una exclusión de versiones anteriores

Las versiones v1 a v3 de este documento declaraban fuera de alcance «servicios en la nube y proveedores externos de correo». Esa afirmación dejó de ser exacta y se corrige aquí.

El sistema emplea dos vías de correo distintas según el destinatario, y la diferencia es deliberada:

| Destinatario | Servidor | Contenido | Sale a Internet |
|---|---|---|:-:|
| Paciente | MailHog local | Fecha, médico y especialidad de su cita | No |
| Administrador | Gmail con credencial SMTP autenticada | Alertas de error y reporte semanal | Sí |

Los correos dirigidos al paciente contienen datos personales y permanecen confinados al entorno local. Las alertas transportan únicamente el nombre del flujo, el nodo que falló y el identificador del registro de error; el reporte semanal contiene conteos agregados y nombres de médicos activos. Ninguno de los dos incluye información que permita identificar a un paciente, lo que hace admisible su entrega por un servicio externo.

Los datos operativos y clínicos siguen residiendo exclusivamente en el contenedor de PostgreSQL. La incorporación de Gmail afecta la vía de notificación al administrador, no el almacenamiento ni el procesamiento.

---

## 5. Arquitectura de la solución

La solución se compone de cuatro contenedores Docker sobre la red interna que Compose crea para el proyecto. Tres publican sus puertos exclusivamente en la interfaz de bucle local `127.0.0.1` y el cuarto no publica ninguno, de modo que ningún servicio queda accesible desde otros equipos de la red: esto constituye en sí mismo una medida de reducción de superficie de exposición.

| Contenedor | Imagen | Rol en el sistema | Puerto publicado |
|---|---|---|:-:|
| **sigac-n8n** | `docker.n8n.io/n8nio/n8n:latest` (v2.33.6) | Motor de orquestación de los flujos de trabajo | 127.0.0.1:5678 |
| **sigac-postgres** | `postgres:16-alpine` | Persistencia de datos operativos, auditoría y errores | 127.0.0.1:5433 |
| **sigac-mailhog** | `mailhog/mailhog:latest` | Servidor SMTP local para notificaciones al paciente | 127.0.0.1:8025 |
| **sigac-gotenberg** | `gotenberg/gotenberg:8` | Conversión de HTML a PDF para el reporte semanal | Ninguno |

Gotenberg no publica puerto alguno porque solo lo consume n8n desde la red interna. Exponerlo al anfitrión no aportaría nada y ampliaría la superficie de exposición sin motivo.

> **Captura 1 — Contenedores en ejecución.** Salida de `docker compose ps` mostrando los cuatro servicios activos y sus puertos publicados en `127.0.0.1`.

### 5.1 Flujo de datos entre componentes

```
  Cliente HTTP (curl / Insomnia)
        │  POST /webhook/{cita,cancelar,cerrar}  + token en cabecera
        ▼
  ┌──────────────────────────────────────────────┐
  │  sigac-n8n  :5678   (WF-00 … WF-06)          │
  └──┬───────────┬───────────┬────────────┬──────┘
     │ SQL       │ SMTP      │ HTTP       │ SMTP
     ▼           ▼           ▼            ▼
  postgres    mailhog    gotenberg    Gmail (externo)
  (10 tablas) :8025      (PDF)        alertas y reporte

  Red interna de Docker creada por Compose
```

### 5.2 Direcciones de acceso

| Dirección | Función |
|---|---|
| `http://localhost:5678` | Editor de n8n |
| `http://localhost:5678/webhook/cita` | Endpoint de ingesta (WF-01) |
| `http://localhost:5678/webhook/cancelar` | Endpoint de cancelación (WF-04) |
| `http://localhost:5678/webhook/cerrar` | Endpoint de cierre de cita (WF-05) |
| `http://localhost:8025` | Bandeja de MailHog |
| `localhost:5433` | PostgreSQL desde herramientas del anfitrión |

**Sobre la doble numeración de puertos de PostgreSQL.** Desde el equipo anfitrión la base se alcanza en el puerto `5433`, porque el `5432` ya está ocupado por una instancia de PostgreSQL instalada en Windows. Desde la red interna de Docker, en cambio, n8n se conecta al host `postgres` en el puerto `5432`, que es el puerto nativo del contenedor. La publicación externa no altera el puerto interno.

### 5.3 Decisiones de arquitectura relevantes

**Volúmenes nombrados en lugar de bind mounts.** Los datos de PostgreSQL se almacenan en un volumen gestionado por Docker y no en una ruta del sistema de archivos de Windows. Los bind mounts sobre DrvFs en WSL no reproducen correctamente el modelo de permisos que exige PostgreSQL, lo que provoca fallos de arranque en bucle del contenedor.

La única excepción es la carpeta `reportes/`, montada como bind mount para que los PDF generados por WF-06 queden accesibles desde el anfitrión. Ahí no hay riesgo: n8n escribe archivos sueltos, no una base que exija permisos POSIX estrictos.

**Habilitación explícita del módulo crypto.** El nodo Code de n8n restringe por defecto la carga de módulos nativos de Node.js. Para implementar el cifrado AES-256-GCM y los hashes SHA-256 se declara la variable `NODE_FUNCTION_ALLOW_BUILTIN=crypto` en la definición del servicio.

**Acceso a variables de entorno desde los nodos Code.** La variable `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` habilita la lectura de `$env` dentro de los nodos Code, necesaria para que la clave de cifrado se lea del entorno y no quede escrita en el flujo.

**Restricción del acceso a archivos.** La variable `N8N_RESTRICT_FILE_ACCESS_TO=/reportes` limita la lectura y escritura de los nodos de archivo a esa única ruta. Se discute en la sección 8.6, porque sustituyó a una configuración más permisiva que constituía un riesgo.

**Separación del correo saliente.** MailHog captura las notificaciones al paciente sin entregarlas a destinatarios reales, lo que permite evidenciarlas durante las pruebas sin exponer datos personales. Las alertas al administrador y el reporte semanal salen por una credencial SMTP autenticada de Gmail, porque su destinatario es una persona real y su contenido no incluye información de pacientes.

---

## 6. Modelo de datos

El esquema consta de diez tablas agrupadas en tres dominios: control de acceso, datos operativos y trazabilidad.

| Tabla | Dominio | Campos principales |
|---|:-:|---|
| **usuario_api** | Acceso | `id`, `rol`, `token_hash`, `activo`, `creado_en` |
| **paciente** | Operativo | `id`, `dpi_cifrado`, `dpi_huella`, `nombre`, `apellido`, `telefono_cifrado`, `fecha_nacimiento`, `correo`, `activo` |
| **medico** | Operativo | `id`, `nombre`, `especialidad`, `colegiado`, `activo` |
| **disponibilidad** | Operativo | `id`, `id_medico`, `dia_semana`, `hora_inicio`, `hora_fin`, `cupos` |
| **solicitud_cita** | Operativo | `id`, `id_paciente`, `tipo_consulta`, `motivo`, `prioridad`, `estado`, `fecha_preferida` |
| **cita** | Operativo | `id`, `id_solicitud`, `id_paciente`, `id_medico`, `fecha_hora`, `estado`, `notificada` |
| **expediente** | Operativo | `id`, `id_paciente`, `id_cita`, `diagnostico_cifrado`, `indicaciones_cifrado`, `creado_por` |
| **lista_espera** | Operativo | `id`, `id_solicitud`, `prioridad`, `posicion`, `atendida`, `creado_en` |
| **bitacora_auditoria** | Trazabilidad | `id`, `tabla_afectada`, `id_registro`, `accion`, `rol`, `datos_enmascarados`, `hash_anterior`, `hash_actual` |
| **log_errores** | Trazabilidad | `id`, `workflow`, `nodo`, `mensaje`, `payload_enmascarado`, `severidad`, `creado_en` |

> **Captura 2 — Esquema desplegado.** Listado de las diez tablas en pgAdmin o mediante consulta a `information_schema`.

### 6.1 Estados definidos

| Entidad | Estado inicial | Estados posteriores | Qué flujo los produce |
|---|---|---|---|
| **solicitud_cita** | `pendiente` | `asignada` · `en_espera` · `rechazada` | WF-02 y WF-04 |
| **cita** | `confirmada` | `atendida` · `cancelada` · `ausente` | WF-04 y WF-05 |

Hasta la incorporación de WF-05 el sistema solo producía dos de los cuatro estados de `cita`. La sección 12.4 documenta cómo se detectó ese hueco y cómo se cerró.

### 6.2 Restricciones de integridad

Las reglas de negocio se declaran en la base de datos y no únicamente en los flujos, de modo que ninguna vía de entrada pueda eludirlas.

| Restricción | Tabla | Qué impide |
|---|---|---|
| `uqcita_medico_horario` | `cita` | Dos citas vigentes del mismo médico a la misma hora |
| `ckdisp_horas` | `disponibilidad` | Hora de fin anterior a la de inicio |
| `ckusuario_rol` | `usuario_api` | Roles distintos de `recepcion`, `medico` o `admin` |
| `cksol_prioridad` | `solicitud_cita` | Prioridad fuera del rango 1 a 5 |
| `unique` sobre `dpi_huella` | `paciente` | Registro duplicado del mismo paciente |
| `unique` sobre `id_cita` | `expediente` | Doble expediente para una misma cita |

### 6.3 El campo `dpi_huella`

Este campo no formaba parte del diseño original y se incorporó al implementar el cifrado. El algoritmo AES-GCM emplea un vector de inicialización aleatorio, de modo que dos cifrados del mismo DPI producen textos distintos. Esa propiedad es deseable desde el punto de vista criptográfico, pero impide buscar un paciente por su DPI o detectar duplicados sin descifrar toda la tabla.

La solución es almacenar junto al valor cifrado una huella SHA-256 determinista con restricción de unicidad. La huella permite localizar y deduplicar sin revelar el dato, y el valor cifrado permite recuperarlo cuando es legítimamente necesario.

### 6.4 Campos con protección criptográfica

El diseño contempla cuatro campos cifrados con AES-256-GCM: `dpi_cifrado` y `telefono_cifrado` en `paciente`, y `diagnostico_cifrado` e `indicaciones_cifrado` en `expediente`. La clave reside en variable de entorno y no se escribe en el flujo ni en el repositorio.

El cifrado opera sobre los dos campos de `paciente`, que son los que WF-01 escribe. Los dos campos de `expediente` permanecen nulos porque WF-03 crea el expediente vacío y su llenado clínico corresponde a la consulta médica, que queda fuera del alcance automatizado.

**Coexistencia de dos formatos.** Los registros creados antes de implementar el cifrado conservan un valor SHA-256 de 64 caracteres, mientras que los posteriores almacenan el formato `iv:textoCifrado:etiqueta` de aproximadamente 84 caracteres. Los primeros no son descifrables, por tratarse de un hash y no de un cifrado. Se documenta la situación en lugar de ocultarla, y no se depuran los registros antiguos por ser datos de prueba sin valor operativo.

---

## 7. Flujos de trabajo (workflows)

La guía exige un mínimo de tres flujos: ingesta, procesamiento y salida. SIGAC tiene siete flujos implementados y publicados.

| Flujo | Propósito | Nodos | Estado |
|---|---|:-:|:-:|
| **WF-00** | Manejo centralizado de errores | 3 | Publicado |
| **WF-01** | Ingesta de solicitudes | 15 | Publicado |
| **WF-02** | Clasificación y asignación | 10 | Publicado |
| **WF-03** | Notificación y apertura de expediente | 4 | Publicado |
| **WF-04** | Reasignación de cupos liberados | 13 | Publicado |
| **WF-05** | Cierre de cita | 10 | Publicado |
| **WF-06** | Reporte semanal de indicadores en PDF | 8 | Publicado |

### WF-00 · Manejador centralizado de errores

Captura cualquier excepción producida en los demás flujos, la registra de forma enmascarada y alerta al administrador por correo real.

```
Error Trigger
  → Registra error           Postgres → log_errores, severidad alta
  → Alerta al administrador  Send Email hacia Gmail
```

Se declara como *Error Workflow* en la configuración de los seis flujos restantes. Centralizar la captura evita duplicar la lógica en cada flujo y garantiza un formato uniforme de registro.

### WF-01 · Ingesta de solicitudes

Recibe la solicitud de cita, autentica al emisor, verifica su rol, valida y sanitiza los datos, cifra los campos sensibles y persiste el registro con su entrada de auditoría.

```
Webhook (POST /webhook/cita)
  → Hash del token           Code
  → Verifica token           Postgres
  → ¿Token válido?           If
        false → Rechazo 401  Code
        true  → ¿Rol autorizado?   If
                  false → Rechazo 403  Code
                  true  → Valida datos  Code
                            → ¿Datos válidos?   If
                                  false → Rechazo 400  Code
                                  true  → Cifra datos sensibles  Code
                                            → Guarda solicitud   Postgres
                                            → Registra bitácora  Postgres
                                            → Registro exitoso   Code
  → Respuesta                Respond to Webhook
```

El token nunca se compara en claro: se calcula su SHA-256 y se contrasta contra el hash almacenado. La validación cubre DPI de trece dígitos, teléfono de ocho dígitos iniciando entre 2 y 8, formato de correo, fecha no anterior a la actual, tipo de consulta dentro de una lista cerrada y presencia de los campos obligatorios. Los errores se acumulan en un arreglo para devolverlos todos en una sola respuesta, en lugar de uno por intento.

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

**Por qué el reparto de cupos se resuelve en un nodo Code y no en SQL.** Todos los elementos del lote se evalúan antes de que se inserte ninguna cita, de modo que una consulta SQL de disponibilidad devolvería el mismo recuento de ocupación para todos y los asignaría al mismo horario. El nodo `Reparte cupos` mantiene el conteo en memoria durante el lote y desplaza treinta minutos por cada cita ya asignada, evitando la colisión.

### WF-03 · Notificación y apertura de expediente

Informa al paciente de su cita confirmada y abre el expediente asociado.

```
Schedule Trigger (cada 5 min)
  → Lee citas sin notificar   Postgres
  → Notifica al paciente      Send Email hacia MailHog
  → Marca y abre expediente   Postgres
```

El correo incluye únicamente fecha, médico y especialidad. No transporta DPI, teléfono ni diagnóstico: es una aplicación deliberada del principio de minimización de datos.

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

El diseño preliminar contemplaba invocar WF-03 mediante un nodo *Execute Workflow* para notificar de inmediato. La implementación prescinde de esa llamada: la cita nueva se crea con `notificada = false` y WF-03 la recoge en su siguiente ejecución programada. Se prefirió así para mantener un único punto de envío de notificaciones y evitar el acoplamiento entre flujos.

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

Es el único flujo que autoriza al rol `medico`, que hasta su incorporación no disponía de ninguna operación. La consulta de cierre valida tres condiciones simultáneas: que la cita esté `confirmada`, que su fecha y hora ya hayan transcurrido, y que el resultado enviado sea uno de los dos valores admitidos. Si cualquiera falla, no se modifica ningún registro y el flujo responde 404.

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

El reporte contiene exclusivamente conteos y nombres de médicos activos. No incluye ningún dato de paciente, ni siquiera enmascarado, lo que permite entregarlo por correo externo.

> **Captura 11 — Reporte generado.** PDF del reporte semanal con las secciones de actividad y acumulados.

### 7.1 Inventario de tipos de nodo utilizados

La guía exige un mínimo de seis tipos de nodo distintos. La implementación emplea doce.

| Categoría | Nodos |
|---|---|
| **Disparadores** | Webhook, Schedule Trigger, Error Trigger |
| **Lógica y control** | If, Switch, Merge |
| **Transformación** | Code |
| **Integración y salida** | Postgres, Send Email, Respond to Webhook, HTTP Request, Read/Write Files |

### 7.2 Configuraciones de nodo que resultaron determinantes

Cuatro ajustes de n8n no son evidentes y condicionan el comportamiento de los flujos. Se documentan porque su omisión produce fallos silenciosos.

| Ajuste | Dónde se aplica | Qué ocurre sin él |
|---|---|---|
| **Query Batching: Independent** | Nodos Postgres que insertan en lote | Una transacción única revierte todo el lote si un solo elemento falla |
| **Always Output Data** | Consultas que pueden no devolver filas y alimentan un IF | El flujo se interrumpe y el webhook queda sin respuesta |
| **Ausencia de Always Output Data** | Consultas que alimentan directamente una acción | Se envía un elemento vacío a la acción, que falla sin causa real |
| **Valores centinela en los parámetros** | Consultas parametrizadas cuyo valor puede venir vacío | n8n no envía el parámetro y PostgreSQL rechaza la consulta |

El tercer caso es la contracara del segundo y produjo el defecto documentado en la sección 12.2. El cuarto apareció al parametrizar las consultas y se describe en la sección 12.6.

---

## 8. Ciberseguridad

La guía establece la ciberseguridad como eje obligatorio y la rúbrica técnica le asigna tres puntos, evaluando tres elementos: validación de entradas, control de acceso y cifrado de información sensible. SIGAC implementa seis capas que cubren los tres elementos y agregan trazabilidad verificable. Las seis están implementadas y verificadas por casos de prueba.

| Capa | Control implementado | Evidencia |
|:-:|---|---|
| 1 | Gestión de secretos: todas las credenciales residen en variables de entorno o en el almacén cifrado de n8n. El archivo `.env` se excluye del control de versiones y se versiona únicamente `.env.example` con marcadores. | El repositorio no contiene `.env` |
| 2 | Autenticación por token: cada petición transporta un token en la cabecera HTTP, cuyo SHA-256 se compara contra el hash almacenado en `usuario_api`. | CP-02 → HTTP 401 |
| 2b | Autorización por rol: `recepcion` registra y cancela citas; `medico` las cierra. | CP-03 → HTTP 403, CP-10 → HTTP 401 |
| 3 | Cifrado en reposo con AES-256-GCM sobre DPI y teléfono. La clave reside en variable de entorno. | Descifrado verificado sobre registros reales |
| 4 | Bitácora de auditoría encadenada por hash SHA-256. | CP-09 → el verificador detecta la cadena rota |
| 5 | Validación estricta de entradas y enmascaramiento del DPI en respuestas y registros. | CP-04 y CP-05 → HTTP 400 |
| 6 | Consultas parametrizadas en los catorce nodos Postgres que reciben valores. | CP-12 → HTTP 201 con un apellido que contiene apóstrofe |

### 8.1 La bitácora encadenada

Cada registro de auditoría almacena el hash del registro anterior, formando una cadena verificable:

```
hash_actual = SHA-256(hash_anterior || tabla_afectada || id_registro)
```

El primer registro es el génesis y su `hash_anterior` se compone de sesenta y cuatro ceros, porque no existe un eslabón previo con el cual encadenar. La alteración directa de cualquier registro en la base rompe la correspondencia con el siguiente y queda detectada.

La comprobación puede ejecutarse en SQL comparando cada `hash_anterior` con el `hash_actual` de la fila precedente, o mediante el script `scripts/verificar_cadena.js`, que recorre la cadena completa y reporta si está íntegra o rota.

> **Captura 4 — Integridad de la bitácora.** Salida del verificador antes y después de alterar manualmente un registro.

### 8.2 Consultas parametrizadas

Los catorce nodos Postgres que reciben valores emplean *Query Parameters* con marcadores `$1`, `$2` en lugar de interpolar las expresiones dentro de la cadena SQL. La consulta y los datos viajan por caminos distintos, de modo que el motor nunca interpreta un dato como instrucción.

| Flujo | Nodos parametrizados |
|---|:-:|
| WF-00 | 1 |
| WF-01 | 3 |
| WF-02 | 3 |
| WF-03 | 1 |
| WF-04 | 4 |
| WF-05 | 2 |
| WF-06 | 0 — sus consultas no reciben valores externos |

La sección 12.5 documenta cómo se demostró que la interpolación era explotable antes de esta corrección.

### 8.3 Otras decisiones de seguridad

- **Mensajes de rechazo genéricos.** La respuesta 401 no distingue entre token ausente, inexistente o desactivado, para no facilitar la enumeración de credenciales válidas.
- **Publicación restringida a `127.0.0.1`.** Ningún servicio queda alcanzable desde otros equipos de la red, y Gotenberg ni siquiera publica puerto.
- **Enmascaramiento del DPI** antes de devolverlo en la respuesta o registrarlo en la bitácora, con el formato `*********0101`.
- **Minimización de datos en el correo:** la notificación al paciente no transporta datos identificativos ni clínicos, y no sale del entorno local.
- **Custodia de la credencial SMTP de Gmail.** El nodo Send Email no admite expresiones en el campo de contraseña, de modo que la contraseña de aplicación reside en el almacén interno de n8n, cifrada con `N8N_ENCRYPTION_KEY`. Pasarla como variable de entorno la expondría en `docker inspect` y en `printenv` dentro del contenedor, de modo que el almacén es la ubicación más segura disponible.

### 8.4 Incidentes de seguridad ocurridos durante el desarrollo

Se documentan dos exposiciones de credenciales ocurridas en el propio proceso de construcción, por su valor formativo.

**Incidente 1 — Clave de cifrado de n8n en `.env.example`.** El proceso que generaba la plantilla a partir del `.env` empleaba una expresión regular que no contemplaba dígitos en el nombre de la variable. `N8N_ENCRYPTION_KEY` contiene un `8`, de modo que no fue reconocida y conservó su valor real. Se corrigió la expresión, se rotó la clave y se reinició el historial de Git, que aún no tenía publicaciones.

**Incidente 2 — Tokens de rol en el historial de Git.** El archivo `02_datos_prueba.sql`, guardado desde pgAdmin, contenía los tokens en claro dentro de la función `sha256()`. Alcanzó un commit ya publicado. Se rotaron los tres tokens, se actualizaron sus hashes en `usuario_api` y se recreó el contenedor de n8n.

**Lección adoptada.** Un secreto que llegó al historial se considera comprometido de forma permanente: reescribir la historia no revoca nada, porque quien clonó antes ya lo tiene. La respuesta correcta es rotar. Como medida preventiva, los archivos versionados llevan marcadores del tipo `PEGA_AQUI_TOKEN` y antes de cada commit se ejecuta una búsqueda de cadenas hexadecimales de sesenta y cuatro caracteres.

### 8.5 Revisión de seguridad del sistema terminado

Con el sistema completo se ejecutó una revisión sobre el repositorio y su historial, buscando los valores reales de los seis secretos del `.env` en los archivos versionados y en todos los commits.

| Comprobación | Resultado |
|---|---|
| Secretos en archivos versionados | Cero coincidencias |
| Secretos en el historial completo de Git | Cero coincidencias |
| `.env` excluido por `.gitignore` | Correcto |

La revisión no encontró fugas, pero sí identificó tres puntos de mejora, todos resueltos y documentados en las secciones 8.6, 12.5 y 8.3 respectivamente.

### 8.6 Acceso de los nodos a los archivos internos de n8n

La variable `N8N_BLOCK_FILE_ACCESS_TO_N8N_FILES` se había declarado con valor `false` al implementar la escritura del reporte en disco. Ese valor desactiva una protección de n8n y permite que los nodos lean los archivos internos del propio motor, incluido el que contiene su llave de cifrado.

No llegó a ser explotada —ningún nodo del sistema lee archivos salvo el que escribe el PDF— pero constituía una exposición innecesaria. Se eliminó la variable, con lo que recupera su valor por defecto y la protección queda activa. `N8N_RESTRICT_FILE_ACCESS_TO=/reportes` sigue permitiendo la escritura del reporte, que es la única operación de archivo que el sistema necesita.

Tras el cambio se ejecutó WF-06 para confirmar que el PDF seguía generándose, evitando introducir una regresión al corregir un riesgo.

### 8.7 Correspondencia con la rúbrica

| Elemento exigido por la rúbrica | Capa que lo cubre |
|---|:-:|
| Credenciales protegidas mediante variables de entorno | Capa 1 |
| Validación de entradas | Capas 5 y 6 |
| Control de acceso | Capas 2 y 2b |
| Cifrado de información sensible | Capa 3 |
| Registro de auditoría (criterio de manejo de datos) | Capa 4 |

---

## 9. Manejo de errores

El manejo de errores se centraliza en WF-00, que actúa como flujo alterno de los seis flujos restantes.

| Tipo de error | Tratamiento | Respuesta |
|---|---|:-:|
| **Token ausente o inválido** | Rechazo controlado con mensaje genérico | HTTP 401 |
| **Rol sin autorización para la operación** | Rechazo controlado | HTTP 401 o 403 |
| **Datos que no superan la validación** | Respuesta con el detalle de los campos rechazados | HTTP 400 |
| **Cita inexistente, no cancelable o no cerrable** | Rechazo controlado en WF-04 y WF-05 | HTTP 404 |
| **Base de datos no disponible** | Captura por Error Trigger, severidad alta, notificación al administrador | — |
| **Excepción no controlada en un nodo** | Captura por Error Trigger, payload enmascarado | — |

Los cuatro primeros son rechazos previstos por el diseño y se resuelven dentro del propio flujo. Los dos últimos son fallos no previstos y activan WF-00.

El mecanismo se verificó cuatro veces en condiciones reales: una detención deliberada de PostgreSQL durante la ejecución (CP-08), un fallo de WF-04 al violarse una restricción de unicidad (sección 12.1), un desbordamiento de longitud en el campo `motivo`, y el error de sintaxis provocado por un apóstrofe antes de parametrizar las consultas (sección 12.5). En los cuatro casos el error quedó registrado en `log_errores` y generó la alerta correspondiente.

> **Captura 5 — Alerta de error.** Correo de alerta al administrador recibido en Gmail, con el identificador de registro coincidente con el de `log_errores`.

---

## 10. Consistencia de la información

La ficha del Avance 2 solicita evidenciar que la información se mantiene consistente después de varias operaciones. El diseño lo garantiza mediante cuatro mecanismos declarados en la base de datos, no en la lógica de los flujos.

| Mecanismo | Qué evita |
|---|---|
| `on conflict (dpi_huella) do update` en `paciente` | Duplicar el paciente al enviar varias solicitudes con el mismo DPI |
| `on conflict (id_cita) do nothing` en `expediente` | Duplicar el expediente al reejecutar WF-03 sobre la misma cita |
| `uqcita_medico_horario` en `cita` | Doble asignación del mismo médico a la misma hora |
| Filtro `notificada = false` en WF-03 | Reenviar la notificación en cada ejecución del temporizador |

**Comprobaciones ejecutadas.**

1. Se enviaron dos solicitudes con el mismo DPI. El resultado fue un único paciente con dos solicitudes asociadas, en lugar de dos pacientes duplicados. La comprobación se repitió tras parametrizar las consultas, con idéntico resultado.
2. Se forzó el reprocesamiento de una cita ya notificada, devolviendo su campo `notificada` a `false`. WF-03 la procesó de nuevo y envió la notificación, pero la consulta de conteo sobre `expediente` devolvió **1**, no 2. El expediente no se duplicó pese a ejecutarse dos veces la misma operación.

La segunda comprobación es la más relevante, porque demuestra que la idempotencia no depende de que el flujo se ejecute una sola vez, sino de una restricción de la base que se cumple siempre.

> **Captura 6 — Consistencia verificada.** Consulta de verificación mostrando un único expediente tras reprocesar la misma cita.

---

## 11. Plan de pruebas

Se definieron doce casos que combinan entradas válidas e inválidas, conforme a la evidencia solicitada en la sección 3 de la guía. **Los doce fueron ejecutados y superados.**

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

### 11.1 Detalle del caso 7 — Reasignación

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

### 11.2 Detalle del caso 10 — Cierre de cita

Se verifican los tres caminos del flujo en una sola secuencia:

| Petición | Resultado esperado | Obtenido |
|---|:-:|:-:|
| Token de médico, cita vencida y confirmada | 200 | 200 |
| Token de recepción sobre la misma operación | 401 | 401 |
| Token de médico, cita de fecha futura | 404 | 404 |

El segundo caso demuestra que la autorización distingue entre roles válidos: recepción es un emisor legítimo del sistema, pero no está facultado para cerrar citas. El tercero demuestra que la validación temporal opera dentro de la propia consulta y no en la lógica del flujo.

> **Captura 12 — Caso 10.** Los tres caminos del flujo de cierre con sus códigos de respuesta.

### 11.3 Reproducción de las pruebas

Los casos 1 a 5 se ejecutan sobre el endpoint de ingesta variando un único elemento de la petición, lo que permite aislar el control que cada uno verifica. Existe una colección de Insomnia con las peticiones y un entorno base donde se completan los tokens tras importarla; los tokens no se versionan.

El README documenta cada caso con su comando ejecutable. Las fechas de los ejemplos se calculan en el momento de ejecución y no se escriben de forma literal, porque la validación rechaza fechas pasadas y cualquier valor fijo caduca.

**Casos destinados al video de demostración:** el caso 1 corresponde al escenario normal y el caso 8 al escenario con error, ambos exigidos explícitamente por la guía. Los casos 7 y 11 se proponen como demostración adicional por ser los más ilustrativos del comportamiento automático del sistema.

---

## 12. Defectos detectados y corregidos

Durante las pruebas se detectaron seis defectos. Ninguno era visible mientras el sistema no se sometió a las operaciones que los provocan, lo que ilustra por qué las pruebas se diseñan sobre escenarios y no sobre funciones aisladas.

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

**Corrección.** Los catorce nodos Postgres que reciben valores se migraron a *Query Parameters* con marcadores `$1`, `$2`. La consulta y los datos viajan por caminos separados y el motor nunca confunde uno con otro.

**Verificación.** La misma petición que antes fallaba devolvió HTTP 201, y una consulta directa confirmó que el apellido quedó almacenado como `O'Connor`, sin caracteres de escape ni mutilación.

**Nota sobre el diseño de la prueba.** Se eligió deliberadamente un apóstrofe en un apellido y no una carga destructiva. Una sentencia de borrado habría demostrado lo mismo a costa de destruir la tabla de errores, que contiene la evidencia del proyecto. El apellido prueba la vulnerabilidad y además expone un fallo funcional que una carga maliciosa no habría revelado.

### 12.6 Parámetro vacío tras la parametrización

**Síntoma.** Después de parametrizar WF-01, una petición sin token devolvió HTTP 200 con el cuerpo vacío en lugar del 401 esperado. El camino exitoso y el de rol no autorizado seguían funcionando.

**Causa.** El nodo que calcula el hash del token devolvía una cadena vacía cuando no venía cabecera. Con la consulta interpolada eso producía una comparación contra cadena vacía, válida y sin resultados. Con parámetros, el valor vacío hace que n8n no envíe el parámetro, y PostgreSQL rechaza la consulta con `there is no parameter $1`.

**Corrección.** Los nodos que preparan los parámetros devuelven valores centinela en lugar de cadenas vacías: `sin-token` para el hash ausente, `0` para un identificador de cita faltante e `invalido` para un resultado de cierre no admitido. Ninguno puede coincidir con un valor legítimo, de modo que la consulta se ejecuta, no encuentra coincidencias y el flujo responde con el rechazo que corresponde.

**Observación metodológica.** Este defecto lo introdujo una corrección de seguridad, y solo apareció porque se probaron los caminos de rechazo y no únicamente el exitoso. Es el argumento más concreto a favor de verificar siempre las tres respuestas posibles de un endpoint y no solo la que confirma que funciona.

---

## 13. Estructura del repositorio

```
ProyectoSIGAC/
├── README.md                     Instalación, ejecución, uso y pruebas
├── docker-compose.yml            Orquestación de los cuatro contenedores
├── .env                          Secretos reales — no versionado
├── .env.example                  Plantilla de variables, con marcadores
├── .gitignore                    Excluye .env y artefactos generados
├── sql/
│   ├── 01_schema.sql             Diez tablas, índices y semilla de auditoría
│   └── 02_datos_prueba.sql       Médicos, disponibilidad y usuarios API
├── workflows/
│   ├── WF-00_errores.json
│   ├── WF-01_ingesta.json
│   ├── WF-02_clasificacion.json
│   ├── WF-03_notificacion.json
│   ├── WF-04_reasignacion.json
│   ├── WF-05_cierre.json
│   └── WF-06_reporte.json
├── scripts/
│   ├── verificar_cadena.js       Validador de la bitácora encadenada
│   └── verificar.sh
├── docs/
│   ├── documento-tecnico.md      Este documento
│   └── uml/                      Diagramas .puml y PDF exportado
└── reportes/                     Salida de WF-06, excluida del control de versiones
```

### 13.1 Convenciones adoptadas

**Nombres de archivo.** Prefijo numérico cuando el orden de ejecución importa, guiones bajos en lugar de espacios y ausencia de tildes. Los flujos exportados siguen el patrón `WF-NN_concepto.json`, ya que n8n los descarga con el nombre del flujo y espacios intercalados.

**Commits.** Uno por bloque funcional cerrado y probado, con prefijo de gitmoji que identifica su naturaleza. El historial acumula veintisiete commits.

**Verificación previa al commit.** Búsqueda de cadenas hexadecimales de sesenta y cuatro caracteres en los archivos versionados. Los flujos exportados contienen legítimamente una: el identificador de instancia de n8n, idéntico en todos ellos.

### 13.2 Control de versiones en tres capas

El proyecto mantiene tres registros de evolución complementarios:

| Capa | Qué registra |
|---|---|
| Historial de Git | Cada bloque funcional cerrado y probado |
| Versiones nombradas en n8n | Cada publicación de un flujo, con nombre y descripción del cambio |
| Control de versiones de este documento | Los cambios de fondo entre entregas |

La segunda capa es propia de n8n 2.x, que separa el borrador del flujo publicado: guardar no basta para que un cambio surta efecto en producción, es necesario publicar, y cada publicación exige nombre de versión y descripción.

> **Captura 10 — Versionado de flujos.** Historial de versiones publicadas de un flujo en n8n.

---

## 14. Estado frente a los requisitos del Avance 2

### 14.1 Mínimos exigidos por la sección 3 de la guía

| # | Requisito | Cómo se cumple |
|:-:|---|---|
| 1 | n8n ejecutándose en entorno local, ideal con Docker | Cuatro contenedores orquestados con Compose |
| 2 | Persistencia local de datos | PostgreSQL 16, diez tablas |
| 3 | Mínimo tres workflows: ingesta, procesamiento y salida | Siete flujos: WF-00 a WF-06 |
| 4 | Al menos seis nodos distintos | Doce tipos de nodo |
| 5 | Manejo de errores: Error Trigger y registro de errores | WF-00, verificado con cuatro fallos reales |
| 6 | Evidencia de pruebas con entradas válidas e inválidas | Doce casos, doce superados |
| 7 | Bitácora de ejecución | Cadena de hashes verificable |
| 8 | Ciberseguridad | Seis capas implementadas |

**Los ocho mínimos están cumplidos.**

### 14.2 Ficha de la reunión de Avance 2 (sección 14 de la guía)

| Elemento solicitado | Estado |
|---|---|
| Un proceso automatizado con n8n funcionando | Siete flujos publicados y operativos |
| Evidencia de manejo de errores y validaciones | WF-00, `log_errores` y casos 2, 4, 5 y 8 |
| Evidencia de la medida de ciberseguridad implementada | Seis capas, sección 8 |
| Evidencia de pruebas realizadas | Doce casos documentados, sección 11 |
| Que la información se mantiene consistente tras varias operaciones | Sección 10, con dos comprobaciones ejecutadas |
| Lo que falta por terminar antes de la entrega final | Sección 15 |

---

## 15. Trabajo pendiente para la entrega final

| # | Tarea | Qué aporta |
|:-:|---|---|
| 1 | Grabar el video de demostración de 5 a 8 minutos | Entregable exigido por la sección 4 de la guía |
| 2 | Añadir `sql/03_verificacion.sql` | Consultas de comprobación reproducibles |
| 3 | Mockups de interfaz para el rol de recepción | Anexo de diseño de una posible implementación futura, fuera del alcance comprometido |

---

## 16. Correspondencia con la rúbrica técnica

La rúbrica de la sección 11 de la guía asigna quince puntos en modalidad individual.

| Criterio evaluado | Pts. | Elemento que lo cubre |
|---|:-:|---|
| Que el proceso automatizado funcione y resuelva el problema | 4 | Siete flujos operativos y doce tipos de nodo, sobre un mínimo exigido de tres flujos y seis nodos |
| Buen diseño técnico | 3 | Arquitectura en contenedores con publicación restringida, modelo de datos normalizado de diez tablas con restricciones declaradas en la base, y manejo de errores centralizado |
| Ciberseguridad | 3 | Seis capas que cubren validación, control de acceso, cifrado y parametrización, con los incidentes del desarrollo documentados y remediados |
| Manejo de errores y de los datos | 2 | WF-00, tabla `log_errores`, bitácora encadenada por hash y consistencia verificada tras operaciones repetidas |
| Documentación clara | 2 | Este documento y el README de instalación, uso y pruebas |
| Evidencia y que se pueda reproducir | 1 | Doce casos de prueba documentados con sus comandos; el entorno completo se levanta con un solo comando |
| **TOTAL** | **15** | |

---

## 17. Control de entregables

Al ser modalidad individual, aplican únicamente los cuatro primeros.

| Entregable | Formato | Estado |
|---|:-:|---|
| Repositorio Git con README, docker-compose, `workflows/` y `docs/` | GitHub | Completo |
| Documento técnico de 8 a 12 páginas | Word o PDF | Este documento, versión 4 |
| Diagrama de arquitectura y del flujo principal | Imagen o PDF | En `docs/uml/` |
| Video de demostración de 5 a 8 minutos, con presencia en cámara | Enlace de Drive | Pendiente |

---

## 18. Control de versiones del documento

| Versión | Fecha | Cambios principales |
|:-:|---|---|
| v1 | 7 de agosto de 2026 | Versión inicial presentada en el Avance 1. Diseño del sistema, arquitectura propuesta y flujos previstos. |
| v2 | Agosto de 2026 | Ampliación del modelo de datos y de las capas de ciberseguridad. |
| v3 | 18 de septiembre de 2026 | Actualización para el Avance 2. Se corrige el número de flujos (de seis previstos a cinco implementados) y de tipos de nodo (de quince a diez). Se documenta el cifrado AES-256-GCM y la coexistencia con el formato anterior. Se actualiza el plan de pruebas a nueve casos superados. Se incorporan la sección de consistencia y la de defectos corregidos. |
| **v4** | **18 de octubre de 2026** | Siete flujos operativos con la incorporación de WF-05 (cierre de cita) y WF-06 (reporte semanal en PDF). Cuarto contenedor, Gotenberg. Doce tipos de nodo. Se corrige la exclusión de alcance relativa a servicios externos de correo y se documenta la separación entre notificaciones locales y alertas externas (sección 4.3). Se añade la sexta capa de ciberseguridad: consultas parametrizadas en los catorce nodos que reciben valores. Se incorporan la revisión de seguridad del sistema terminado (8.5), el riesgo de acceso a archivos internos de n8n y su corrección (8.6), y tres defectos nuevos: el ciclo de vida incompleto (12.4), la inyección SQL demostrada y corregida (12.5) y el parámetro vacío introducido por esa misma corrección (12.6). El plan de pruebas pasa de nueve a doce casos. |

### 18.1 Nota sobre la evolución del documento

Cada versión de este documento ha corregido afirmaciones de la anterior que el diseño daba por hechas y la implementación no confirmó. La v3 redujo seis flujos a cinco y quince tipos de nodo a diez. La v4 vuelve a subir esas cifras, pero por una razón distinta: lo que en septiembre estaba pendiente se construyó.

Dos correcciones de esta versión merecen señalarse por su naturaleza. La primera es la exclusión de alcance sobre proveedores externos de correo, que dejó de ser cierta y se sustituye por una descripción de qué sale del entorno local y qué no. La segunda es el riesgo de inyección SQL, que las versiones anteriores declaraban como pendiente y aceptable: resultó ser explotable con una entrada tan común como un apellido con apóstrofe, y está corregido.

Se declaran explícitamente en lugar de sustituirse en silencio, porque la distancia entre lo que un documento afirma y lo que el sistema hace es, en sí misma, un resultado del análisis.
