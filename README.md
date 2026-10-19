# SIGAC — Sistema de Gestión de Atención Clínica

Automatización del ciclo de solicitud, clasificación, asignación, notificación y
cierre de citas clínicas mediante n8n, en un entorno **local** basado en
contenedores.

**Análisis de Sistemas II**

*Última actualización: 18 de octubre de 2026*

---

## 1. Problema que resuelve

En una clínica de atención general, las solicitudes de cita llegan por canales
dispersos, se asignan a criterio del personal, no existe trazabilidad sobre quién
consultó cada expediente y los datos sensibles (DPI, teléfono, diagnóstico) se
manejan sin protección ni control de acceso diferenciado.

SIGAC automatiza el ciclo **solicitud → autenticación → autorización → validación
→ registro → clasificación → asignación → notificación → expediente → cierre**,
con la ciberseguridad como eje transversal del diseño.

---

## 2. Arquitectura

| Contenedor | Imagen | Rol | Puerto |
|---|---|---|---|
| `sigac-n8n` | `docker.n8n.io/n8nio/n8n:latest` | Motor de flujos | 127.0.0.1:5678 |
| `sigac-postgres` | `postgres:16-alpine` | Persistencia | 127.0.0.1:5433 |
| `sigac-mailhog` | `mailhog/mailhog:latest` | SMTP local | 127.0.0.1:8025 |
| `sigac-gotenberg` | `gotenberg/gotenberg:8` | Conversión HTML a PDF | sin publicar |

Los puertos publicados lo son **únicamente en `127.0.0.1`**: no son alcanzables
desde la red local. Gotenberg no publica ninguno: solo lo alcanza n8n por la red
interna de Docker, donde cada servicio se resuelve por su nombre (`postgres`,
`mailhog`, `gotenberg`).

### Correo saliente

El sistema usa dos vías de correo según el destinatario:

| Destinatario | Servidor | Contenido |
|---|---|---|
| Paciente | MailHog local | Fecha, médico y especialidad de su cita |
| Administrador | Gmail real | Alertas de error y reporte semanal |

La separación es deliberada: los correos al paciente llevan datos personales y no
salen del entorno local. Las alertas y el reporte contienen solo identificadores
de flujo y datos agregados, de modo que pueden entregarse por un servicio externo
sin exponer información clínica.

Diagramas en `docs/uml/`: arquitectura de contenedores, flujo principal (WF-01),
casos de uso, clases y secuencia. El PDF `DiagramasUML.pdf` contiene los cinco
ya renderizados.

---

## 3. Requisitos

- Docker Desktop (o Docker Engine + Compose v2)
- Git
- `curl` o un cliente HTTP como Insomnia o Postman
- Una cuenta de Gmail con verificación en dos pasos, para generar una contraseña
  de aplicación
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

Editar `.env` y completar cada variable. Los secretos se generan así:

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
| `SIGAC_TOKEN_RECEPCION` | Token del rol recepción |
| `SIGAC_TOKEN_MEDICO` | Token del rol médico |
| `SIGAC_TOKEN_ADMIN` | Token del rol administrador |

> `SIGAC_CLAVE_CIFRADO` debe tener exactamente 64 caracteres hexadecimales, que
> son los 32 bytes que exige AES-256. El nodo de cifrado falla si no los tiene.

> La contraseña de aplicación de Gmail no aparece en esta tabla y no se pasa como
> variable de entorno. El nodo Send Email de n8n no admite expresiones en el campo
> de contraseña, de modo que la credencial reside en el almacén interno de n8n,
> cifrada con `N8N_ENCRYPTION_KEY`. Pasarla por entorno la expondría en
> `docker inspect` y en `printenv` dentro del contenedor.

### 4.3 Registrar los tokens en la base

El archivo `sql/02_datos_prueba.sql` incluye marcadores `PEGA_AQUI_TOKEN`.
Antes del primer arranque, reemplazarlos por los valores reales de `.env`.
La base almacena únicamente el **SHA-256** de cada token, nunca el token en claro.

### 4.4 Levantar el entorno

```bash
docker compose up -d
docker compose ps
```

Los scripts de `sql/` se ejecutan automáticamente en el **primer** arranque de
PostgreSQL, en orden alfabético. Si la base ya existe, no se vuelven a ejecutar.
Para forzar su reejecución hay que eliminar el volumen:

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

Importar los siete archivos de `workflows/` mediante el menú `...` →
*Import from File*, en este orden:

| Archivo | Flujo |
|---|---|
| `WF-00_errores.json` | Manejador centralizado de errores |
| `WF-01_ingesta.json` | Ingesta de solicitudes |
| `WF-02_clasificacion.json` | Clasificación y asignación |
| `WF-03_notificacion.json` | Notificación y expediente |
| `WF-04_reasignacion.json` | Reasignación de cupos liberados |
| `WF-05_cierre.json` | Cierre de cita |
| `WF-06_reporte.json` | Reporte semanal en PDF |

Para cada flujo importado:

1. Asignar la credencial `SIGAC PostgreSQL` a sus nodos Postgres. Para los nodos
   Send Email: `SIGAC MailHog` en WF-03, y `SIGAC Gmail` en WF-00 y WF-06.
2. Entrar a **Settings** del flujo y establecer **Error Workflow** →
   `WF-00 Manejador de errores`. Esto aplica a los seis flujos restantes;
   WF-00 no apunta a ninguno.
3. Publicar con el botón **Publish**, indicando nombre de versión y descripción.

> En n8n 2.x guardar no basta: el flujo tiene un borrador y una versión
> publicada, y el endpoint de producción responde con la publicada. Todo cambio
> requiere publicar de nuevo.

---

## 5. Uso

### Endpoints

| Método y ruta | Flujo | Función |
|---|---|---|
| `POST /webhook/cita` | WF-01 | Registrar una solicitud de cita |
| `POST /webhook/cancelar` | WF-04 | Cancelar una cita y reasignar su cupo |
| `POST /webhook/cerrar` | WF-05 | Marcar una cita como atendida o ausente |

Todos en `http://localhost:5678`.

Los flujos WF-02, WF-03 y WF-06 no tienen endpoint: se disparan por temporizador.
Los dos primeros cada cinco minutos, el reporte los domingos a las 23:00. La
asignación de médico y horario y la notificación al paciente ocurren de forma
diferida, no dentro de la petición.

### Cabeceras

```
Content-Type: application/json
X-SIGAC-Token: <token del rol correspondiente>
```

El rol `recepcion` registra y cancela citas; el rol `medico` las cierra.

### Cuerpo — registrar una solicitud

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
  "fecha_preferida": "2026-11-10"
}
```

### Cuerpo — cancelar una cita

```json
{
  "id_cita": 26,
  "motivo": "el paciente no puede asistir"
}
```

### Cuerpo — cerrar una cita

```json
{
  "id_cita": 45,
  "resultado": "atendida"
}
```

El campo `resultado` admite únicamente `atendida` o `ausente`.

### Reglas de validación aplicadas

| Campo | Regla |
|---|---|
| `dpi` | Exactamente 13 dígitos |
| `telefono` | 8 dígitos, primer dígito entre 2 y 8 |
| `correo` | Formato de correo válido |
| `fecha_preferida` | Fecha válida y no anterior al día actual |
| `tipo_consulta` | `urgencia`, `control` o `general` |
| `nombre`, `apellido`, `fecha_nacimiento` | Obligatorios |

Los errores de validación se acumulan y se devuelven todos en una sola respuesta,
en lugar de uno por intento.

Para el cierre, además: la cita debe estar `confirmada` y su fecha y hora ya
haber transcurrido. No se puede cerrar una cita futura.

### Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | Cancelación o cierre procesados |
| 201 | Solicitud registrada |
| 400 | Los datos no superan la validación |
| 401 | Token ausente o inválido, o rol sin autorización en WF-05 |
| 403 | El rol no autoriza la operación |
| 404 | La cita no existe o no está en condiciones de cancelarse o cerrarse |

---

## 6. Pruebas

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

La respuesta incluye `id_solicitud`, el hash de auditoría y el DPI enmascarado.

### CP-02 · Autenticación ausente → 401

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -d '{"dpi":"2547896320101","nombre":"Juan"}'
```

### CP-03 · Autorización insuficiente → 403

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO" \
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

Enviar más solicitudes de las que el médico tiene cupos para ese día. La
disponibilidad cargada por `02_datos_prueba.sql` asigna cuatro cupos al médico 1
los lunes por la mañana, de modo que la quinta solicitud en adelante debe pasar a
`lista_espera`.

```bash
FECHA_LUNES=$(date -d "next monday" +%F)

for i in 1 2 3 4 5 6; do
  curl -s -o /dev/null -w "solicitud $i → HTTP %{http_code}\n" \
    -X POST http://localhost:5678/webhook/cita \
    -H "Content-Type: application/json" \
    -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
    -d '{"dpi":"25478963201'"$i$i"'","nombre":"Paciente'"$i"'","apellido":"Prueba","telefono":"55123456","correo":"p'"$i"'@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"prueba","fecha_preferida":"'"$FECHA_LUNES"'"}'
done
```

Esperar a que WF-02 corra (hasta cinco minutos) y verificar:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c "
select id, estado, prioridad from solicitud_cita order by id desc limit 6;
select le.id, le.id_solicitud, le.prioridad, le.atendida from lista_espera le where le.atendida = false;
"
```

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

Alterar manualmente un registro de auditoría y comprobar que el verificador lo
detecta:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c \
  "update bitacora_auditoria set id_registro = 999 where id = 8;"

./scripts/verificar.sh          # debe reportar CADENA ROTA
```

Restaurar el valor original y verificar de nuevo:

```bash
docker compose exec postgres psql -U sigac_app -d sigac -c \
  "update bitacora_auditoria set id_registro = 7 where id = 8;"

./scripts/verificar.sh          # debe reportar CADENA INTEGRA
```

> El valor original depende del contenido real de la tabla. Consultarlo antes de
> alterarlo: `select id, id_registro from bitacora_auditoria where id = 8;`

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
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO" \
  -d '{"id_cita": 45, "resultado": "atendida"}'

# rol no autorizado
curl -s -o /dev/null -w "rol erroneo → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cerrar \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"id_cita": 54, "resultado": "atendida"}'

# cita futura
curl -s -o /dev/null -w "cita futura → HTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cerrar \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_MEDICO" \
  -d '{"id_cita": 1182, "resultado": "atendida"}'
```

### CP-11 · Reporte semanal → PDF generado y enviado

Abrir **WF-06** en n8n y pulsar **Execute workflow** sin esperar al domingo.

```bash
ls -la reportes/
```

Debe aparecer un archivo `semana_AAAA-SS.pdf` con la fecha de ejecución, y llegar
un correo al administrador con el documento adjunto.

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

### Comprobación de inyección SQL

Un apellido con apóstrofe es entrada legítima y debe registrarse sin error:

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320777","nombre":"Juan","apellido":"O'"'"'Connor","telefono":"55123456","correo":"t@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"prueba","fecha_preferida":"'"$FECHA"'"}'
```

Debe devolver **201**. Antes de parametrizar las consultas, el apóstrofe cerraba
la cadena SQL y PostgreSQL rechazaba la sentencia con un error de sintaxis.

---

## 7. Ciberseguridad implementada

| Capa | Control | Estado |
|---|---|---|
| 1 | Credenciales en variables de entorno; `.env` excluido del repositorio | Implementada |
| 2 | Autenticación por token (SHA-256, comparación hash contra hash) | Implementada |
| 2b | Autorización por rol: `recepcion` registra y cancela, `medico` cierra | Implementada |
| 3 | Cifrado AES-256-GCM en reposo sobre DPI y teléfono | Implementada |
| 4 | Bitácora de auditoría encadenada por hash SHA-256 | Implementada |
| 5 | Validación estricta de entradas y enmascaramiento del DPI en la salida | Implementada |
| 6 | Consultas parametrizadas en los siete flujos | Implementada |

Decisiones de arquitectura con impacto en seguridad:

- Los contenedores **no se exponen a la red local**: solo a `127.0.0.1`, y
  Gotenberg ni siquiera eso.
- El token nunca se compara en claro: se hashea y se contrasta contra
  `usuario_api.token_hash`.
- La autenticación y la autorización se resuelven en nodos separados:
  saber *quién es* el emisor no implica que pueda ejecutar la operación.
- Los mensajes de rechazo son genéricos: no revelan si el token existe pero
  está inactivo, ni si el rol es incorrecto.
- El DPI se enmascara (`*********0101`) antes de devolverlo o registrarlo.
- El correo al paciente no transporta DPI, teléfono ni diagnóstico, y no sale
  del entorno local.
- El reporte semanal contiene solo conteos agregados y nombres de médicos
  activos, lo que permite entregarlo por correo externo.

### Parametrización de las consultas

Los catorce nodos Postgres que reciben valores usan **Query Parameters** con
marcadores `$1`, `$2` en lugar de interpolar las expresiones dentro de la cadena
SQL. La consulta y los datos viajan por caminos distintos, de modo que el motor
nunca interpreta un dato como instrucción.

La parametrización introdujo un efecto que conviene conocer: cuando una expresión
se evalúa a cadena vacía, n8n no envía el parámetro y PostgreSQL rechaza la
consulta con `there is no parameter $1`. Por eso los nodos que calculan el hash
del token devuelven valores centinela — `sin-token`, `0`, `invalido` — en lugar
de cadenas vacías cuando falta un dato en la petición. Así la consulta siempre
recibe un valor, no encuentra coincidencias y el flujo responde con el rechazo
que corresponde.

### Formato de los campos cifrados

Conviven dos formatos en la base. Los registros creados antes de implementar el
cifrado conservan un SHA-256 de 64 caracteres y no son descifrables, por tratarse
de un hash. Los posteriores usan `iv:textoCifrado:etiqueta`, de unos 84
caracteres. Se documenta la situación en lugar de depurar los registros antiguos,
que son datos de prueba sin valor operativo.

---

## 8. Estructura del repositorio

```
ProyectoSIGAC/
├── README.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── sql/
│   ├── 01_schema.sql          10 tablas + indices + semilla de auditoria
│   └── 02_datos_prueba.sql    medicos, disponibilidad y usuarios de la API
├── workflows/
│   ├── WF-00_errores.json         manejador centralizado de errores
│   ├── WF-01_ingesta.json         ingesta de solicitudes
│   ├── WF-02_clasificacion.json   clasificacion y asignacion
│   ├── WF-03_notificacion.json    notificacion y expediente
│   ├── WF-04_reasignacion.json    reasignacion de cupos liberados
│   ├── WF-05_cierre.json          cierre de cita
│   └── WF-06_reporte.json         reporte semanal en PDF
├── scripts/
│   ├── verificar_cadena.js    validador de la bitacora encadenada
│   └── verificar.sh           envoltorio que lo ejecuta en el contenedor
├── docs/
│   ├── documento-tecnico.md   documento tecnico del proyecto
│   └── uml/                   diagramas .puml y PDF exportado
└── reportes/                  salida de WF-06, ignorada por git
```

---

## 9. Modelo de datos

Diez tablas agrupadas en tres dominios.

| Dominio | Tablas |
|---|---|
| Control de acceso | `usuario_api` |
| Operativo | `paciente`, `medico`, `disponibilidad`, `solicitud_cita`, `cita`, `expediente`, `lista_espera` |
| Trazabilidad | `bitacora_auditoria`, `log_errores` |

Estados definidos:

| Entidad | Estado inicial | Estados posteriores | Quién los produce |
|---|---|---|---|
| `solicitud_cita` | `pendiente` | `asignada` · `en_espera` · `rechazada` | WF-02 y WF-04 |
| `cita` | `confirmada` | `atendida` · `cancelada` · `ausente` | WF-04 y WF-05 |

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

## 10. Estado del proyecto

| Flujo | Descripción | Nodos | Estado |
|---|---|:-:|---|
| WF-00 | Manejador centralizado de errores | 3 | Operativo |
| WF-01 | Ingesta de solicitudes | 15 | Operativo |
| WF-02 | Clasificación y asignación | 10 | Operativo |
| WF-03 | Notificación y expediente | 4 | Operativo |
| WF-04 | Reasignación de cupos liberados | 13 | Operativo |
| WF-05 | Cierre de cita | 10 | Operativo |
| WF-06 | Reporte semanal en PDF | 8 | Operativo |

Tipos de nodo distintos utilizados: **12** (Webhook, Schedule Trigger, Error
Trigger, If, Switch, Merge, Code, Postgres, Send Email, Respond to Webhook,
HTTP Request, Read/Write Files), sobre un mínimo exigido de seis.

Pendiente para la entrega final: video de demostración y mockups de interfaz como
anexo de diseño.

---

## 11. Detener el entorno

```bash
docker compose down          # detiene y elimina los contenedores
docker compose down -v       # además elimina los volúmenes (borra la base)
```

Los datos sobreviven a `docker compose down` porque residen en un volumen
nombrado. Solo `-v` los elimina.
