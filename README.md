# SIGAC — Sistema de Gestión de Atención Clínica

Automatización del ciclo de atención de una clínica —solicitud, asignación,
notificación, expediente, nota clínica, historial y cierre de citas— mediante
n8n, en un entorno **local** basado en contenedores.

**Análisis de Sistemas II** · Universidad Mariano Gálvez de Guatemala, Campus Cobán

---

## 1. Problema que resuelve

En una clínica de atención general, las solicitudes de cita llegan por canales
dispersos, se asignan a criterio del personal, no existe trazabilidad sobre quién
consultó cada expediente y los datos sensibles (DPI, teléfono, diagnóstico) se
manejan sin protección ni control de acceso diferenciado.

SIGAC automatiza el ciclo **solicitud → autenticación → autorización → validación
→ registro → clasificación → asignación → notificación → expediente → nota
clínica → consulta del historial → cierre**, con la ciberseguridad como eje
transversal del diseño. Un flujo de administración gestiona además el alta, la
suspensión y la baja de pacientes, médicos y recepcionistas sin borrar su
historial, y un flujo de consultas entrega a la aplicación web la agenda del
médico, las citas del día, la lista de espera y la lista de personas.

La **aplicación web** reúne todo en tres pantallas, una por rol: la agenda del
médico, el panel de recepción y la administración de personas.

---

## 2. Arquitectura

| Contenedor | Imagen | Rol | Puerto |
|---|---|---|---|
| `sigac-n8n` | `docker.n8n.io/n8nio/n8n:latest` | Motor de flujos | 127.0.0.1:5678 |
| `sigac-postgres` | `postgres:16-alpine` | Persistencia | 127.0.0.1:5433 |
| `sigac-mailhog` | `mailhog/mailhog:latest` | SMTP local | 127.0.0.1:8025 |
| `sigac-gotenberg` | `gotenberg/gotenberg:8` | Conversión HTML a PDF | sin publicar |
| `sigac-web` | `nginx:alpine` | Aplicación web y reenvío de `/api/` a n8n | 127.0.0.1:8080 |

Los puertos publicados lo son **únicamente en `127.0.0.1`**: no son alcanzables
desde la red local. Gotenberg no publica ninguno: solo lo alcanza n8n por la red
interna de Docker, donde cada servicio se resuelve por su nombre (`postgres`,
`mailhog`, `gotenberg`, `n8n`).

La aplicación web nunca habla directamente con n8n ni con la base: el navegador
pide `/api/consulta` a `sigac-web`, y Nginx lo reenvía a `n8n:5678/webhook/consulta`
por la red interna. Así la web pasa por los mismos controles que cualquier
petición (token, rol, validación y bitácora), y no hay peticiones entre orígenes
distintos.

### Correo saliente

El sistema usa dos vías de correo según el destinatario:

| Destinatario | Servidor | Contenido |
|---|---|---|
| Paciente | MailHog local | Cita confirmada, aviso de lista de espera, cambio de médico o cancelación por baja del médico |
| Administrador | Gmail real | Alertas de error y reporte semanal |

La separación es deliberada: los correos al paciente llevan datos personales y no
salen del entorno local. Las alertas y el reporte contienen solo identificadores
de flujo y datos agregados, de modo que pueden entregarse por un servicio externo
sin exponer información clínica. Ningún flujo envía información clínica por correo.

Diagramas en `docs/uml/`: arquitectura de contenedores, flujo principal (WF-01),
casos de uso, clases y secuencia. `NuevosDiagramasUML.pdf` los contiene ya
renderizados en su versión actual; `DiagramasUML.pdf` conserva la versión
anterior como evidencia de la evolución del diseño.

---

## 3. Requisitos

- Docker Desktop (o Docker Engine + Compose v2)
- Git
- `curl` o un cliente HTTP como Insomnia o Postman
- `openssl`, para generar los secretos
- Una cuenta de Gmail con verificación en dos pasos, para generar una contraseña
  de aplicación
- Node.js 18 o superior y npm, solo para ejecutar las pruebas unitarias
- Un navegador actual (Edge, Chrome o Firefox) para la aplicación web
- Opcional: pgAdmin o DBeaver para inspeccionar la base

---

## 4. Instalación

### 4.1 Clonar el repositorio

```bash
git clone git@github.com:JOMALLMM1116/ProyectoSIGAC.git
cd ProyectoSIGAC
```

### 4.2 Generar el archivo de variables de entorno

El archivo `.env` **no se versiona**. Se construye a partir de `.env.example`:

```bash
cp .env.example .env
```

Editar `.env` y completar cada variable. Cada secreto y cada token se genera por
separado con:

```bash
openssl rand -hex 32
```

| Variable | Descripción |
|---|---|
| `POSTGRES_USER` | Usuario de la base (`sigac_app`) |
| `POSTGRES_PASSWORD` | Contraseña de la base |
| `POSTGRES_DB` | Nombre de la base (`sigac`) |
| `SMTP_HOST` / `SMTP_PORT` | `mailhog` / `1025` |
| `SIGAC_CORREO_ADMIN` | Destinatario de alertas y reportes |
| `SIGAC_GMAIL_USUARIO` | Cuenta de Gmail que envía las alertas |
| `SIGAC_GMAIL_HOST` / `SIGAC_GMAIL_PORT` | `smtp.gmail.com` / `465` |
| `N8N_ENCRYPTION_KEY` | Llave con que n8n cifra sus credenciales guardadas |
| `SIGAC_CLAVE_CIFRADO` | Llave del cifrado de datos sensibles (32 bytes exactos) |
| `SIGAC_TOKEN_RECEPCION` | Token de la recepcionista |
| `SIGAC_TOKEN_ADMIN` | Token del administrador |
| `SIGAC_TOKEN_MEDICO_1` a `SIGAC_TOKEN_MEDICO_5` | Un token por médico |
| `SIGAC_TOKEN_MEDICO` | Token genérico de médico. Solo lo usa la semilla inicial, que lo deja desactivado |

> `SIGAC_CLAVE_CIFRADO` debe tener exactamente 64 caracteres hexadecimales, que
> son los 32 bytes que exige AES-256. El nodo de cifrado falla si no los tiene.

> La contraseña de aplicación de Gmail no aparece en esta tabla y no se pasa como
> variable de entorno. El nodo Send Email de n8n no admite expresiones en el campo
> de contraseña, de modo que la credencial reside en el almacén interno de n8n,
> cifrada con `N8N_ENCRYPTION_KEY`. Pasarla por entorno la expondría en
> `docker inspect` y en `printenv` dentro del contenedor.

### 4.3 Registrar los tokens en la base

La base almacena únicamente el **SHA-256** de cada token, nunca el token en claro.
El archivo `sql/02_datos_prueba.sql` trae marcadores que deben reemplazarse por
los valores de `.env` **antes del primer arranque**:

| Línea | Marcador | Reemplazar por |
|:-:|---|---|
| 26 | `PEGA_AQUI_TOKEN` (rol `recepcion`) | `SIGAC_TOKEN_RECEPCION` |
| 27 | `PEGA_AQUI_TOKEN` (rol `medico`) | `SIGAC_TOKEN_MEDICO` |
| 28 | `PEGA_AQUI_TOKEN` (rol `admin`) | `SIGAC_TOKEN_ADMIN` |
| 173 a 177 | `PEGA_AQUI_TOKEN_MEDICO_1` a `_5` | `SIGAC_TOKEN_MEDICO_1` a `_5` |

> Las líneas 26 a 28 usan el mismo marcador, pero cada una debe recibir un token
> distinto: la columna `token_hash` es única y la semilla falla si dos filas
> tienen el mismo valor.

**Después del primer arranque, restaurar los marcadores**, para que los tokens
reales nunca lleguen al repositorio:

```bash
git checkout sql/02_datos_prueba.sql
```

### 4.4 Levantar el entorno

```bash
docker compose up -d
docker compose ps
```

Deben quedar cinco contenedores en `Up`.

Los scripts de `sql/` se ejecutan automáticamente en el **primer** arranque de
PostgreSQL, en orden alfabético. Si la base ya existe, no se vuelven a ejecutar.
Para forzar su reejecución hay que eliminar el volumen, lo que **borra todos los
datos**:

```bash
docker compose down
docker volume rm proyecto_sigac_sigac_postgres_data
docker compose up -d
```

### 4.5 Configurar las credenciales en n8n

1. Abrir `http://localhost:5678` y crear la cuenta de propietario (es local).

2. Crear una credencial de tipo **Postgres**, nombrada `SIGAC PostgreSQL`:

| Campo | Valor |
|---|---|
| Host | `postgres` |
| Database | `sigac` |
| User | el de `POSTGRES_USER` |
| Password | el de `POSTGRES_PASSWORD` |
| Port | `5432` |

> El host es `postgres` y el puerto `5432` porque n8n se conecta por la red
> interna de Docker. El `5433` solo aplica desde el equipo anfitrión.

3. Crear una credencial de tipo **SMTP**, nombrada `SIGAC MailHog`:

| Campo | Valor |
|---|---|
| Host | `mailhog` |
| Port | `1025` |
| User / Password | vacíos |
| SSL/TLS | desactivado |

4. Crear una segunda credencial **SMTP**, nombrada `SIGAC Gmail`:

| Campo | Valor |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `465` |
| User | la cuenta de Gmail |
| Password | la contraseña de aplicación de 16 caracteres, sin espacios |
| SSL/TLS | activado |

> La contraseña de aplicación se genera en `myaccount.google.com` → Seguridad →
> Contraseñas de aplicaciones, y requiere tener activada la verificación en dos
> pasos.

### 4.6 Importar y publicar los flujos

Importar los once archivos de `workflows/` mediante el menú `...` →
*Import from File*, en este orden:

| Archivo | Flujo |
|---|---|
| `WF-00_errores.json` | Manejador centralizado de errores |
| `WF-01_ingesta.json` | Ingesta de solicitudes |
| `WF-02_clasificacion.json` | Clasificación y asignación |
| `WF-03_notificacion.json` | Notificación, expediente y aviso de espera |
| `WF-04_reasignacion.json` | Reasignación de cupos liberados |
| `WF-05_cierre.json` | Cierre de cita |
| `WF-06_reporte.json` | Reporte semanal en PDF |
| `WF-07_nota_clinica.json` | Registro de nota clínica |
| `WF-08_historial_clinico.json` | Consulta de historial clínico |
| `WF-09_administracion.json` | Administración de personas |
| `WF-10_consultas.json` | Consultas para la aplicación web |

Para cada flujo importado:

1. Asignar la credencial `SIGAC PostgreSQL` a sus nodos Postgres. Para los nodos
   Send Email: `SIGAC MailHog` en WF-03 y WF-09, y `SIGAC Gmail` en WF-00 y WF-06.
2. Entrar a **Settings** del flujo y establecer **Error Workflow** →
   `WF-00 Manejador de errores`. Esto aplica a los diez flujos restantes;
   WF-00 no apunta a ninguno.
3. En **WF-01, WF-07, WF-08, WF-09 y WF-10**, comprobar en **Settings** que las
   ejecuciones exitosas y las manuales estén en *Do not save*. Esos flujos
   manejan DPI, diagnósticos o tokens en claro (el nodo Webhook guarda las
   cabeceras recibidas, y ahí viaja el token), y n8n guardaría una copia en su
   historial de ejecuciones.
4. Publicar con el botón **Publish**, indicando nombre de versión y descripción.

> En n8n 2.x guardar no basta: el flujo tiene un borrador y una versión
> publicada, y el endpoint de producción responde con la publicada. Todo cambio
> requiere publicar de nuevo.

### 4.7 Abrir la aplicación web

Con los flujos publicados, la aplicación web está en:

```
http://localhost:8080
```

La pantalla de inicio presenta el sistema con una ilustración de la clínica, el
eslogan *«Cada paciente a tiempo, cada dato seguro»* y sus tres ideas principales.
Se inicia sesión con el token de la persona: el de un médico, el de recepción o
el del administrador. La web consulta quién es y abre la pantalla de su rol:

| Rol | Pantalla | Qué permite |
|---|---|---|
| medico | Mi agenda | Ver sus citas por fecha; en un panel lateral, consultar el historial clínico, escribir la nota y marcar la cita como atendida o ausente |
| recepcion | Recepción | Barra lateral con cuatro secciones: **Panel** (resumen del día en cuatro tarjetas, agenda de hoy con buscador, lista de espera resumida y actividad de la sesión), **Nueva solicitud** (validación de cada campo antes de enviar), **Citas** (rango de hasta 31 días, filtros por estado, médico y tipo, paginación y cancelación) y **Lista de espera** |
| admin | Personas | Ver médicos, recepcionistas y pacientes; agregarlos, desactivarlos, darlos de baja y reactivarlos. Al agregar un médico, la especialidad se compara con las que ya existen: si coincide aunque cambien las mayúsculas o las tildes, se usa la del catálogo, y si no existe, la web pide confirmación antes de crear una nueva |

- El token se guarda solo mientras la pestaña está abierta (`sessionStorage`):
  al cerrarla hay que volver a iniciar sesión. **Cerrar sesión** lo borra.
- Si el administrador desactiva a alguien con la web abierta, su siguiente acción
  lo devuelve a la pantalla de inicio.
- El token de una persona nueva o reactivada aparece **una sola vez**, en una caja
  destacada con los botones **Copiar** y **Ya lo entregué**.
- La web tiene tres modos de color, **Claro**, **Intermedio** y **Oscuro**, y
  recuerda el elegido. La primera vez usa el del sistema operativo.
- La validación de la nueva solicitud en la página solo ayuda a la persona a
  corregir antes de enviar: WF-01 sigue siendo quien valida, y sus rechazos se
  muestran arriba del formulario.
- La **actividad de la sesión** vive solo en la memoria de la página: muestra lo
  que la recepcionista registró o canceló desde que entró, y se borra al recargar.
- La confirmación de una especialidad nueva evita que un error de escritura
  (por ejemplo, «Mecina General») se convierta en una especialidad distinta, con
  la que ninguna solicitud coincidiría. Crear especialidades sigue siendo posible.

### 4.8 Íconos de la aplicación web

Los íconos son **Material Symbols** de Google, con licencia **Apache 2.0**. No se
cargan desde los servidores de Google: el script `scripts/construir_iconos.sh`
los descarga del repositorio oficial y los junta en un solo archivo,
`web/img/iconos.svg`, junto con la licencia en `web/img/iconos-LICENSE.txt`. Así
la política de seguridad de Nginx no se abre a servidores externos, la web
funciona sin conexión a Internet y el navegador no avisa a nadie al cargarlos.

El archivo ya está en el repositorio. Solo hace falta volver a ejecutar el
script para agregar un ícono: se suma su nombre a la lista `ICONOS` (los nombres
son los de https://fonts.google.com/icons) y luego:

```bash
./scripts/construir_iconos.sh
```

La ilustración de la pantalla de inicio, `web/img/clinica.svg`, es original del
proyecto.

> Después de cambiar un archivo `.js` o `.css`, recarga con las herramientas del
> navegador abiertas (**F12**), clic derecho en recargar → *Vaciar caché y volver
> a cargar de manera forzada*. Si no, el navegador puede seguir usando la versión
> anterior.

> Para copiar un token del `.env` sin mostrarlo en la terminal, ábrelo en el
> editor, selecciona el valor con doble clic y cópialo. Desde WSL, `clip.exe`
> puede no llegar al portapapeles de Windows.

---

## 5. Uso

### Endpoints

| Método y ruta | Flujo | Rol | Función |
|---|---|---|---|
| `POST /webhook/cita` | WF-01 | recepcion | Registrar una solicitud de cita |
| `POST /webhook/cancelar` | WF-04 | recepcion | Cancelar una cita y reasignar su cupo |
| `POST /webhook/cerrar` | WF-05 | medico | Marcar una cita como atendida o ausente |
| `POST /webhook/nota` | WF-07 | medico | Registrar una nota clínica cifrada |
| `POST /webhook/historial` | WF-08 | medico | Consultar el historial clínico de un paciente |
| `POST /webhook/admin` | WF-09 | admin | Administrar pacientes, médicos y recepcionistas |
| `POST /webhook/consulta` | WF-10 | según la consulta | Consultas de solo lectura para la aplicación web |

Todos en `http://localhost:5678`. La aplicación web llega a los mismos endpoints por `http://localhost:8080/api/...`, a través de Nginx.

Los flujos WF-02, WF-03 y WF-06 no tienen endpoint: se disparan por temporizador.
Los dos primeros cada cinco minutos, el reporte los domingos a las 23:00. La
asignación de médico y horario y la notificación al paciente ocurren de forma
diferida, no dentro de la petición.

### Cabeceras

```
Content-Type: application/json
X-SIGAC-Token: <token de la persona que hace la petición>
```

Cada médico usa su propio token (`SIGAC_TOKEN_MEDICO_1` a `_5`): el sistema sabe
qué médico llama, y la firma de una nota clínica sale del token, no del cuerpo de
la petición.

### Cuerpo — registrar una solicitud (WF-01)

```json
{
  "dpi": "2547896320101",
  "nombre": "Juan",
  "apellido": "Perez",
  "telefono": "55123456",
  "correo": "juan@correo.com",
  "fecha_nacimiento": "1990-05-12",
  "tipo_consulta": "general",
  "motivo": "dolor de cabeza",
  "fecha_preferida": "2026-11-10",
  "franja_preferida": "tarde",
  "hora_solicitada": "14:00",
  "especialidad_solicitada": "Medicina General",
  "id_medico_solicitado": 4
}
```

Los cuatro últimos campos son **preferencias opcionales**. El sistema decide solo
lo que el paciente no decidió: sin médico, elige al de menor carga de la
especialidad pedida; sin especialidad, Medicina General.

### Cuerpo — cancelar una cita (WF-04)

```json
{
  "id_cita": 26,
  "motivo": "el paciente no puede asistir"
}
```

### Cuerpo — cerrar una cita (WF-05)

```json
{
  "id_cita": 45,
  "resultado": "atendida"
}
```

El campo `resultado` admite únicamente `atendida` o `ausente`.

### Cuerpo — registrar una nota clínica (WF-07)

```json
{
  "id_cita": 45,
  "diagnostico": "migraña tensional",
  "indicaciones": "reposo y control en dos semanas"
}
```

`indicaciones` es opcional. La cita debe ser del médico que llama, tener
expediente abierto y estar atendida, o confirmada con la hora ya pasada. La nota
es inmutable: un diagnóstico no se corrige, se agrega otro.

### Cuerpo — consultar el historial clínico (WF-08)

```json
{
  "id_cita": 45
}
```

Se envía una cita y no un paciente: el paciente se deduce de una cita propia del
médico. Devuelve las diez notas más recientes, descifradas, y cada consulta queda
registrada en la bitácora, aunque el historial esté vacío.

### Cuerpo — administración de personas (WF-09)

```json
{
  "accion": "desactivar",
  "entidad": "paciente",
  "id": 12
}
```

| `accion` | `entidad` | Campos adicionales | Respuesta exitosa |
|---|---|---|:-:|
| `agregar` | `medico`, `recepcionista` | `nombre`; el médico además `especialidad` y `colegiado` | 201 con el token |
| `desactivar` | `paciente`, `medico`, `recepcionista` | `id` | 200 |
| `dar_baja` | `paciente`, `medico`, `recepcionista` | `id` | 200 |
| `reactivar` | `paciente`, `medico`, `recepcionista` | `id` | 200; médico y recepcionista con token nuevo |

- La baja es lógica: la persona deja de operar, pero su historial se conserva. Es
  definitiva y no se puede revertir.
- Los pacientes no se agregan aquí: se registran con su primera solicitud en WF-01.
- Al desactivar o dar de baja a un médico, sus citas futuras pasan a otro médico de
  su especialidad o de Medicina General, con la misma fecha y hora; si nadie puede
  atenderlas, se cancelan. Cada paciente afectado recibe un correo.
- El token de una persona nueva o reactivada se devuelve **una sola vez**, en la
  respuesta. No se puede recuperar después.

### Cuerpo — consultas para la aplicación web (WF-10)

```json
{
  "consulta": "agenda",
  "fecha": "2026-10-27"
}
```

Un solo endpoint con cinco consultas. Cada una exige un rol, y ninguna modifica
datos:

| `consulta` | Rol | Devuelve | `fecha` |
|---|---|---|---|
| `sesion` | todos | Rol y nombre de quien llama; si es médico, su especialidad | No aplica |
| `agenda` | medico | Las citas propias del médico en esa fecha, sin las canceladas, con `tiene_nota` | Opcional; sin ella, hoy |
| `citas` | recepcion | Las citas de todos los médicos en esa fecha, canceladas incluidas | Opcional; sin ella, hoy |
| `lista_espera` | recepcion | Las solicitudes en espera, en el orden en que WF-04 repartiría los cupos | No aplica |
| `personas` | admin | Médicos, recepcionistas y pacientes con su estado: activo, inactivo o baja | No aplica |

- La consulta `sesion` es la que usa la pantalla de inicio de la web para saber a
  qué pantallas enviar a cada persona. Cada inicio de sesión queda registrado en
  la bitácora.
- El médico sale del token: la agenda solo devuelve las citas de quien la pide.
- Ninguna consulta devuelve DPI, teléfono, correo ni identificadores de token.
  Solo `id_cita` e `id` de persona, que son los que necesitan los demás
  endpoints.
- «Hoy» se calcula en hora de Guatemala, no en la del servidor.

### Reglas de validación aplicadas

| Campo | Regla |
|---|---|
| `dpi` | Exactamente 13 dígitos |
| `telefono` | 8 dígitos, primer dígito entre 2 y 8 |
| `correo` | Formato de correo válido |
| `fecha_preferida` | Fecha que exista en el calendario y no anterior al día actual |
| `fecha_nacimiento` | Fecha que exista, no futura ni anterior a 1900 |
| `tipo_consulta` | `urgencia`, `control` o `general` |
| `motivo` | Máximo 255 caracteres |
| `franja_preferida` | `manana`, `tarde` o `indiferente`, sin eñe |
| `hora_solicitada` | Dentro de una franja real (08:00–12:00 o 13:30–17:00) y coherente con la franja pedida |
| `especialidad_solicitada` | Una especialidad con médicos activos; no distingue mayúsculas ni tildes |
| `id_medico_solicitado` | Entero positivo de un médico activo, de la especialidad pedida si se indicó |
| `id_cita`, `id` | Entero positivo |
| `consulta` (WF-10) | `sesion`, `agenda`, `citas`, `lista_espera` o `personas` |
| `fecha` (WF-10) | Formato `AAAA-MM-DD` y que exista en el calendario |
| `nombre`, `apellido` | Obligatorios |

Los errores de validación se acumulan y se devuelven todos en una sola respuesta,
en lugar de uno por intento.

### Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | Operación procesada |
| 201 | Registro creado: solicitud, nota clínica o persona |
| 400 | Los datos no superan la validación |
| 401 | Token ausente o inválido; en WF-04 y WF-05, también rol sin autorización |
| 403 | El rol no autoriza la operación |
| 404 | La cita o la persona no existe, es ajena o no está en condiciones de la operación |
| 409 | Conflicto con el estado actual: paciente inactivo que pide cita, persona ya dada de baja o ya activa, colegiado repetido, paciente con citas o solicitudes en curso |

Todas las respuestas comparten el formato `{ codigo, estado, mensaje, ... }`.

---

## 6. Pruebas del sistema

Hay dos URLs disponibles para cada webhook:

| URL | Cuándo usarla |
|---|---|
| `/webhook/...` | Producción. Requiere el flujo **publicado**. Las ejecuciones aparecen en la pestaña *Executions*, no en el lienzo. |
| `/webhook-test/...` | Prueba. Requiere pulsar **Listen for test event** antes de cada ejecución. Las ejecuciones se ven en el lienzo. |

Los ejemplos siguientes usan la URL de producción. Cargar antes las variables y
calcular una fecha futura:

```bash
set -a; source .env; set +a
FECHA=$(date -d "+10 days" +%F)
```

> La fecha se calcula en el momento en lugar de escribirse fija, porque la
> validación rechaza fechas pasadas y cualquier valor literal caduca.

### CP-01 · Solicitud válida → 201

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320101","nombre":"Juan","apellido":"Perez","telefono":"55123456","correo":"juan@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"dolor","fecha_preferida":"'"$FECHA"'"}'
```

La respuesta incluye el `id_solicitud`, el estado `pendiente` y el hash de auditoría. El DPI no se devuelve: se guarda cifrado y aparece enmascarado solo en la bitácora.

### CP-02 · Autenticación ausente → 401

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -d '{"dpi":"2547896320101","nombre":"Juan"}'
```

### CP-03 · Autorización insuficiente → 403

Un médico intentando registrar una solicitud:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"dpi":"2547896320101","nombre":"Juan"}'
```

### CP-04 · Validación de formato → 400

DPI de 10 dígitos en lugar de 13.

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320","nombre":"Juan","apellido":"Perez","telefono":"55123456","correo":"juan@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"dolor","fecha_preferida":"'"$FECHA"'"}'
```

### CP-05 · Validación de negocio → 400

Fecha preferida en el pasado.

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320101","nombre":"Juan","apellido":"Perez","telefono":"55123456","correo":"juan@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"dolor","fecha_preferida":"2020-01-15"}'
```

### CP-06 · Sin disponibilidad → lista de espera

Los miércoles cada médico atiende con dos cupos por la mañana y dos por la tarde.
Sin especialidad, las solicitudes van a Medicina General, que tiene dos médicos:
ocho cupos en total. De doce solicitudes, ocho deben recibir cita y cuatro pasar a
`lista_espera`.

```bash
FECHA_MIERCOLES=$(date -d "next wednesday" +%F)

for i in $(seq 1 12); do
  DPI="2547896320$(printf '%03d' $i)"
  curl -s -o /dev/null -w "solicitud $i → HTTP %{http_code}\n" \
    -X POST http://localhost:5678/webhook/cita \
    -H "Content-Type: application/json" \
    -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
    -d '{"dpi":"'"$DPI"'","nombre":"Paciente'"$i"'","apellido":"Prueba","telefono":"55123456","correo":"p'"$i"'@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"prueba","fecha_preferida":"'"$FECHA_MIERCOLES"'"}'
done
```

Esperar a que WF-02 corra (hasta cinco minutos) y verificar:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select estado, count(*) from solicitud_cita
where fecha_preferida = '$FECHA_MIERCOLES' group by estado;
"
```

> Si ese miércoles ya tiene citas de pruebas anteriores, los conteos cambian.
> Conviene usar una semana sin citas.

### CP-07 · Reasignación → 200

Localizar una cita confirmada y cancelarla. El cupo debe pasar al siguiente en
lista de espera para esa misma fecha.

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id, id_medico, fecha_hora, estado from cita where estado = 'confirmada' order by id limit 5;
"
```

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cancelar \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"id_cita": 26, "motivo": "el paciente no puede asistir"}'
```

La respuesta devuelve `estado: "reasignado"` con tres identificadores: la cita
cancelada, la cita nueva y la solicitud beneficiada. Si no hay nadie esperando
para esa fecha, devuelve `estado: "cancelado"`, que también es correcto.

Verificación:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id, id_solicitud, id_medico, fecha_hora, estado from cita order by id desc limit 5;
select le.id, le.id_solicitud, le.atendida from lista_espera le order by le.id;
"
```

La cita nueva debe conservar el mismo médico y el mismo horario que la cancelada.

### CP-08 · Caída de dependencia → WF-00 captura el error

> **Advertencia:** este caso detiene el contenedor de PostgreSQL a propósito.
> No ejecutarlo si hay operaciones en curso.

```bash
docker compose stop postgres
```

Esperar a que WF-02 o WF-03 intenten ejecutarse (hasta cinco minutos) y levantar
de nuevo la base:

```bash
docker compose start postgres
```

El error queda registrado y se envía una alerta al administrador:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id, workflow, nodo, mensaje, severidad, creado_en from log_errores order by id desc limit 5;
"
```

La alerta llega al correo configurado en `SIGAC_CORREO_ADMIN`.

### CP-09 · Integridad de la bitácora → cadena rota

Consultar primero el valor original del registro que se va a alterar:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c \
  "select id, id_registro from bitacora_auditoria where id = 8;"
```

Alterarlo y comprobar que el verificador lo detecta:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c \
  "update bitacora_auditoria set id_registro = 999 where id = 8;"

./scripts/verificar.sh          # debe reportar CADENA ROTA
```

Restaurar el valor original (aquí `7`; usar el que devolvió la consulta) y
verificar de nuevo:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c \
  "update bitacora_auditoria set id_registro = 7 where id = 8;"

./scripts/verificar.sh          # debe reportar CADENA INTEGRA
```

### CP-10 · Cierre de cita → 200, 401 y 404

Localizar una cita confirmada cuya fecha ya haya transcurrido:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id, id_medico, fecha_hora, estado from cita
where estado = 'confirmada' and fecha_hora <= now() order by id limit 3;
"
```

Los tres caminos del flujo, ajustando los identificadores a los que devuelva la
consulta anterior:

```bash
# cierre exitoso con token de medico
curl -s -o /dev/null -w "valido      → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cerrar \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"id_cita": 45, "resultado": "atendida"}'

# rol no autorizado
curl -s -o /dev/null -w "rol erroneo → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cerrar \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"id_cita": 54, "resultado": "atendida"}'

# cita futura
curl -s -o /dev/null -w "cita futura → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cerrar \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"id_cita": 1182, "resultado": "atendida"}'
```

### CP-11 · Reporte semanal → PDF generado y enviado

Abrir **WF-06** en n8n y pulsar **Execute workflow** sin esperar al domingo.

```bash
ls -la reportes/
```

Debe aparecer un archivo `semana_AAAA-SS.pdf`, numerado según la semana ISO, y
llegar un correo al administrador con el documento adjunto.

### CP-12 · Inyección SQL → 201

Un apellido con apóstrofe es entrada legítima y debe registrarse sin error:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320777","nombre":"Juan","apellido":"O'"'"'Connor","telefono":"55123456","correo":"t@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"prueba","fecha_preferida":"'"$FECHA"'"}'
```

Debe devolver **201**, y el apellido debe quedar guardado como `O'Connor`.

### Nota clínica e historial (WF-07 y WF-08)

Localizar una cita del médico 1 con expediente abierto y hora ya pasada:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select c.id, c.fecha_hora, c.estado from cita c
join expediente e on e.id_cita = c.id
where c.id_medico = 1 and c.fecha_hora <= now()
  and c.estado in ('confirmada', 'atendida')
order by c.id limit 3;
"
CITA=45   # reemplazar por un id de la consulta anterior
```

Registrar una nota (201) y consultar el historial desde la misma cita (200):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/nota \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"id_cita": '"$CITA"', "diagnostico": "migraña tensional", "indicaciones": "reposo, control en dos semanas"}'

curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/historial \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"id_cita": '"$CITA"'}'
```

La misma cita con el token de otro médico debe responder **404**, y con el de
recepción, **403**:

```bash
curl -s -o /dev/null -w "otro medico → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/historial \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_2" \
  -d '{"id_cita": '"$CITA"'}'

curl -s -o /dev/null -w "recepcion   → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/historial \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"id_cita": '"$CITA"'}'
```

En la base, el diagnóstico queda cifrado y la consulta del historial queda
registrada en la bitácora:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id, left(diagnostico_cifrado, 30) as diagnostico from nota_clinica order by id desc limit 1;
select id, tabla_afectada, accion from bitacora_auditoria order by id desc limit 2;
"
```

### Administración de personas (WF-09)

> Las respuestas que crean o reactivan a una persona incluyen su token en claro.
> Los ejemplos lo ocultan con `sed` antes de mostrarlo: un token que aparece en la
> pantalla, o en una captura, debe tratarse como comprometido.

Agregar una recepcionista (201):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/admin \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_ADMIN" \
  -d '{"accion": "agregar", "entidad": "recepcionista", "nombre": "Coc Caal, Maria Jose"}' \
  | sed -E 's/[a-f0-9]{64}/(oculto)/g'
```

Desactivar a un paciente sin citas ni solicitudes en curso (200), o con ellas
(409, con los conteos):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/admin \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_ADMIN" \
  -d '{"accion": "desactivar", "entidad": "paciente", "id": 12}'
```

Una entrada sin acción ni entidad responde **400** con los dos errores, y
cualquier token que no sea de administrador, **403**.

> Desactivar o dar de baja a un médico reasigna o cancela sus citas futuras y
> envía correos a sus pacientes. No ejecutarlo sobre los médicos 1 a 5 sin
> intención de probar esa operación.

### Consultas para la aplicación web (WF-10)

Quién llama y qué pantallas le corresponden (200 para los tres roles):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/consulta \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"consulta": "sesion"}'
```

La agenda del médico para una fecha (200):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/consulta \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO_1" \
  -d '{"consulta": "agenda", "fecha": "'"$FECHA"'"}'
```

Las citas del día de todos los médicos (200) y la lista de espera (200), con el
token de recepción:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/consulta \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"consulta": "citas", "fecha": "'"$FECHA"'"}'

curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/consulta \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"consulta": "lista_espera"}'
```

La lista de personas, con el token de administrador (200). La lista de pacientes
puede ser larga:

```bash
curl -s -X POST http://localhost:5678/webhook/consulta \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_ADMIN" \
  -d '{"consulta": "personas"}' | head -c 1500; echo
```

Los rechazos:

| Petición | Resultado |
|---|:-:|
| Sin token, o con un token desactivado | 401 |
| Consulta inexistente, como `pacientes` | 400 |
| Recepción pidiendo `agenda`; médico pidiendo `citas` o `lista_espera`; recepción pidiendo `personas` | 403 |
| Fecha `2026-02-30` o `21/10/2026` | 400 |

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/consulta \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"consulta": "agenda"}'
```

### Comprobación de consistencia

Enviar dos solicitudes con el mismo DPI debe producir **un solo paciente** con
dos solicitudes asociadas, no dos pacientes duplicados:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select count(*) as pacientes from paciente where dpi_huella = encode(sha256('2547896320101'::bytea), 'hex');
"
```

Reprocesar una cita ya notificada no duplica su expediente:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id_cita, count(*) from expediente group by id_cita having count(*) > 1;
"
```

La consulta debe devolver cero filas.

---

## 7. Pruebas unitarias

Los 57 nodos Code de WF-00 a WF-09 tienen pruebas unitarias con Jest: el
equivalente de JUnit, Mockito y JaCoCo. Se ejecutan sin levantar los
contenedores. Los 12 nodos Code de WF-10 se verificaron con sus casos contra el
endpoint (sección 6).

```bash
cd pruebas
npm install
npm run test:unitarias      # las pruebas unitarias
npm run test:cobertura      # las pruebas y el informe de cobertura
```

El informe de cobertura queda en `pruebas/coverage/index.html`. Desde WSL se abre
con:

```bash
explorer.exe "$(wslpath -w coverage/index.html)"
```

Los archivos de `pruebas/nodos/` se generan a partir de los flujos exportados y
no se editan a mano. Si un nodo Code cambia en n8n, exportar el flujo a
`workflows/` y regenerarlos:

```bash
npm run extraer
```

El detalle de cada nodo, sus casos de prueba y los resultados están en
`docs/documento-pruebas.pdf`.

---

## 8. Ciberseguridad implementada

| Capa | Control |
|:-:|---|
| 1 | Credenciales en variables de entorno o en el almacén cifrado de n8n; `.env` excluido del repositorio |
| 2 | Autenticación por token: SHA-256 del token recibido contra el hash almacenado |
| 2b | Autorización por rol: `recepcion` registra y cancela, y consulta las citas del día y la lista de espera; `medico` cierra, escribe notas, consulta historiales y su agenda; `admin` administra personas y consulta su lista |
| 2c | Identidad de la persona en el token: cada médico y cada recepcionista tiene el suyo |
| 3 | Cifrado AES-256-GCM en reposo de DPI, teléfono, diagnóstico e indicaciones |
| 4 | Bitácora de auditoría encadenada por hash SHA-256 |
| 4b | Auditoría de acceso: cada consulta del historial clínico y cada inicio de sesión quedan registrados |
| 5 | Validación estricta de entradas y enmascaramiento del DPI en la bitácora |
| 6 | Consultas parametrizadas en todos los nodos Postgres que reciben valores |
| 7 | Historial de n8n sin datos sensibles: WF-01, WF-07, WF-08, WF-09 y WF-10 no guardan ejecuciones exitosas ni manuales |

Decisiones de arquitectura con impacto en seguridad:

- Los contenedores **no se exponen a la red local**: solo a `127.0.0.1`, y
  Gotenberg ni siquiera eso.
- El token nunca se compara en claro: se hashea y se contrasta contra
  `usuario_api.token_hash`.
- La autenticación y la autorización se resuelven en nodos separados:
  saber *quién es* el emisor no implica que pueda ejecutar la operación.
- Los mensajes de rechazo son genéricos: no revelan si el token existe pero
  está inactivo, ni si el rol es incorrecto.
- WF-07 y WF-08 responden el mismo 404 para una cita inexistente y para una cita
  de otro médico: no revelan si existe.
- El DPI nunca se devuelve en las respuestas, y en la bitácora se registra enmascarado (`*********0101`).
- El correo al paciente no transporta DPI, teléfono ni diagnóstico, y no sale
  del entorno local.
- El reporte semanal contiene solo conteos agregados y nombres de médicos
  activos, lo que permite entregarlo por correo externo.

Decisiones de la aplicación web:

- **Nginx solo reenvía `/webhook/`** y solo peticiones `POST`: el editor de n8n y
  las URLs de prueba no son alcanzables desde la web, y cualquier otro método
  recibe 403 sin llegar a n8n.
- **Política de seguridad de contenido**: el navegador solo ejecuta JavaScript y
  CSS servidos por la propia web. Ninguna página tiene código dentro del HTML.
- **Todo el texto del servidor se escribe con `textContent`**, nunca como HTML:
  un nombre con caracteres especiales nunca se interpreta como código.
- **El token vive en `sessionStorage`**, no en `localStorage` ni en el código: se
  borra al cerrar la pestaña.
- **Cabeceras de seguridad** en cada respuesta: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy` y `Content-Security-Policy`.
- El historial clínico solo se pide cuando el médico pulsa **Ver historial**:
  cada consulta queda en la bitácora, y la web no genera lecturas que nadie pidió.

Comprobación del verificador de la bitácora en cualquier momento:

```bash
./scripts/verificar.sh
```

### Parametrización de las consultas

Los treinta y siete nodos Postgres que reciben valores usan **Query Parameters**
con marcadores `$1`, `$2` en lugar de interpolar las expresiones dentro de la
cadena SQL. La consulta y los datos viajan por caminos distintos, de modo que el
motor nunca interpreta un dato como instrucción.

Dos detalles de n8n que conviene conocer:

- **Valores centinela.** Cuando una expresión se evalúa a cadena vacía, n8n no
  envía el parámetro y PostgreSQL rechaza la consulta. Por eso los nodos que
  preparan los parámetros devuelven `sin-token`, `0` o `invalido` cuando falta un
  dato: la consulta siempre recibe un valor, no encuentra coincidencias y el flujo
  responde con el rechazo que corresponde.
- **Parámetros como lista.** En el formato separado por comas, n8n corta el texto
  en cada coma, incluidas las que vienen dentro de un dato. Los nodos que reciben
  texto libre —nombres, motivos, mensajes de error— pasan los parámetros como una
  lista en una sola expresión: `{{ [ $json.a, $json.b ] }}`.

---

## 9. Estructura del repositorio

```
ProyectoSIGAC/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── sql/
│   ├── 01_schema.sql          12 tablas, indices y restricciones
│   └── 02_datos_prueba.sql    medicos, horario, recepcionista y tokens
├── workflows/
│   ├── WF-00_errores.json            manejador centralizado de errores
│   ├── WF-01_ingesta.json            ingesta de solicitudes
│   ├── WF-02_clasificacion.json      clasificacion y asignacion
│   ├── WF-03_notificacion.json       notificacion, expediente y aviso de espera
│   ├── WF-04_reasignacion.json       reasignacion de cupos liberados
│   ├── WF-05_cierre.json             cierre de cita
│   ├── WF-06_reporte.json            reporte semanal en PDF
│   ├── WF-07_nota_clinica.json       registro de nota clinica
│   ├── WF-08_historial_clinico.json  consulta de historial clinico
│   ├── WF-09_administracion.json     administracion de personas
│   └── WF-10_consultas.json          consultas para la aplicacion web
├── nginx/
│   └── sigac-web.conf         sirve web/ y reenvia /api/ a n8n
├── web/
│   ├── index.html             inicio de sesion
│   ├── css/                   estilos (tres modos), pantallas, visual (iconos e inicio) y panel (recepcion)
│   ├── img/                   iconos.svg con su licencia, y la ilustracion clinica.svg
│   ├── js/                    sesion, api, tema, pagina y login, mas uno por pantalla
│   ├── medico/agenda.html     pantalla del medico
│   ├── recepcion/panel.html   pantalla de recepcion
│   └── admin/personas.html    pantalla de administracion
├── scripts/
│   ├── verificar_cadena.js    validador de la bitacora encadenada
│   ├── verificar.sh           envoltorio que lo ejecuta en el contenedor
│   └── construir_iconos.sh    descarga los iconos Material Symbols a web/img/
├── pruebas/
│   ├── package.json           scripts de Jest y umbral de cobertura
│   ├── extraer_nodos.js       genera nodos/ a partir de workflows/
│   ├── simulacion.js          herramientas compartidas para simular n8n
│   ├── nodos/                 un archivo por nodo Code, generado
│   └── tests/                 un archivo de prueba por nodo
├── docs/
│   ├── documento-tecnico.md   documento tecnico del proyecto
│   ├── documento-pruebas.pdf  pruebas unitarias, simulacion y cobertura
│   └── uml/                   diagramas .puml y PDF exportado
└── reportes/                  salida de WF-06, ignorada por git
```

---

## 10. Modelo de datos

Doce tablas agrupadas en tres dominios.

| Dominio | Tablas |
|---|---|
| Control de acceso | `usuario_api` |
| Operativo | `paciente`, `medico`, `recepcionista`, `disponibilidad`, `solicitud_cita`, `cita`, `expediente`, `nota_clinica`, `lista_espera` |
| Trazabilidad | `bitacora_auditoria`, `log_errores` |

Estados definidos:

| Entidad | Estado inicial | Estados posteriores | Quién los produce |
|---|---|---|---|
| `solicitud_cita` | `pendiente` | `asignada` · `en_espera` · `rechazada` | WF-02 y WF-04 |
| `cita` | `confirmada` | `atendida` · `cancelada` · `ausente` | WF-04, WF-05 y WF-09 |
| `paciente`, `medico`, `recepcionista` | activo | inactivo · baja | WF-09 |

Las personas tienen tres estados con dos columnas: activo (`activo = true`),
inactivo (`activo = false`, reversible) y baja (`activo = false` con fecha en
`baja_en`, definitiva).

### Médicos y horario

| id | Nombre | Especialidad |
|:-:|---|---|
| 1 | Ana Lucia Morales Chub | Medicina General |
| 2 | Carlos Enrique Coc Ical | Pediatria |
| 3 | Silvia Beatriz Cu Pop | Medicina Interna |
| 4 | Luis Fernando Caal Xol | Medicina General |
| 5 | Marta Elena Tzub Quej | Ginecologia |

| Días | Mañana (08:00–12:00) | Tarde (13:30–17:00) |
|---|:-:|:-:|
| Lunes, martes, jueves y viernes | 8 cupos | 7 cupos |
| Miércoles | 2 cupos | 2 cupos |

Cada cita dura treinta minutos.

### El campo `paciente.dpi_huella`

Guarda un SHA-256 del DPI. Existe porque el cifrado con IV aleatorio produce un
texto distinto cada vez, lo que impediría buscar o detectar duplicados sobre el
campo cifrado. La huella es determinista y lleva restricción de unicidad.

### El índice `uqcita_medico_horario`

Impide que un médico tenga dos citas **vigentes** a la misma hora. Está declarado
como índice único parcial y no como restricción de tabla:

```sql
create unique index uqcita_medico_horario
  on cita (id_medico, fecha_hora)
  where estado <> 'cancelada';
```

La cláusula `where` excluye las citas canceladas: al cancelar, el horario vuelve
a quedar libre y WF-04 puede reasignarlo. El estado `ausente` permanece dentro
del índice, porque el paciente no se presentó pero el horario sí se consumió.
PostgreSQL no admite `where` dentro de un `constraint unique`, de ahí que sea un
índice.

---

## 11. Estado del proyecto

| Flujo | Descripción | Nodos | Estado |
|---|---|:-:|---|
| WF-00 | Manejador centralizado de errores | 3 | Operativo |
| WF-01 | Ingesta de solicitudes | 18 | Operativo |
| WF-02 | Clasificación y asignación | 10 | Operativo |
| WF-03 | Notificación, expediente y aviso de espera | 7 | Operativo |
| WF-04 | Reasignación de cupos liberados | 13 | Operativo |
| WF-05 | Cierre de cita | 10 | Operativo |
| WF-06 | Reporte semanal en PDF | 8 | Operativo |
| WF-07 | Registro de nota clínica | 18 | Operativo |
| WF-08 | Consulta de historial clínico | 18 | Operativo |
| WF-09 | Administración de personas | 38 | Operativo |
| WF-10 | Consultas para la aplicación web | 28 | Operativo |

Tipos de nodo distintos utilizados: **12** (Webhook, Schedule Trigger, Error
Trigger, If, Switch, Merge, Code, Postgres, Send Email, Respond to Webhook,
HTTP Request, Read/Write Files), sobre un mínimo exigido de seis.

La **aplicación web** está operativa en `http://localhost:8080`, con las
pantallas de médico, recepción y administración.

---

## 12. Detener el entorno

```bash
docker compose stop          # detiene los contenedores sin eliminarlos
docker compose down          # detiene y elimina los contenedores
docker compose down -v       # además elimina los volúmenes (borra la base)
```

Los datos sobreviven a `docker compose stop` y a `docker compose down` porque
residen en un volumen nombrado. Solo `-v` los elimina.
