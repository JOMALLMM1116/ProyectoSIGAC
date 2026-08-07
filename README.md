# SIGAC — Sistema de Gestión de Atención Clínica

Automatización del ciclo de solicitud, validación y registro de citas clínicas
mediante n8n, en un entorno **100 % local** basado en contenedores.

**Análisis de Sistemas II** — Código 0902-037 — Ing. Edgar Raúl Molina Rey
Universidad Mariano Gálvez de Guatemala, Campus Cobán
José Manuel Maquin Leal — Carné 4090-22-3506

---

## 1. Problema que resuelve

En una clínica de atención general, las solicitudes de cita llegan por canales
dispersos, se asignan a criterio del personal, no existe trazabilidad sobre quién
consultó cada expediente y los datos sensibles (DPI, teléfono, diagnóstico) se
manejan sin protección ni control de acceso diferenciado.

SIGAC automatiza el ciclo **solicitud → autenticación → autorización → validación
→ registro**, con la ciberseguridad como eje transversal del diseño.

---

## 2. Arquitectura

| Contenedor | Imagen | Rol | Puerto |
|---|---|---|---|
| `sigac-n8n` | `docker.n8n.io/n8nio/n8n:latest` | Motor de flujos | 127.0.0.1:5678 |
| `sigac-postgres` | `postgres:16-alpine` | Persistencia | 127.0.0.1:5433 |
| `sigac-mailhog` | `mailhog/mailhog:latest` | SMTP local | 127.0.0.1:8025 |

Los tres puertos se publican **únicamente en `127.0.0.1`**: no son alcanzables
desde la red local. La comunicación entre contenedores ocurre por la red interna
de Docker, donde cada servicio se resuelve por su nombre (`postgres`, `mailhog`).

Diagramas en `docs/`: arquitectura de contenedores y flujo de WF-01.

---

## 3. Requisitos

- Docker Desktop (o Docker Engine + Compose v2)
- Git
- `curl` o un cliente HTTP como Insomnia o Postman
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
| `SIGAC_CORREO_ADMIN` | Destinatario de alertas |
| `N8N_ENCRYPTION_KEY` | Llave con que n8n cifra sus credenciales guardadas |
| `SIGAC_CLAVE_CIFRADO` | Llave del cifrado de datos sensibles (32 bytes) |
| `SIGAC_TOKEN_RECEPCION` | Token del rol recepción |
| `SIGAC_TOKEN_MEDICO` | Token del rol médico |
| `SIGAC_TOKEN_ADMIN` | Token del rol administrador |

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

### 4.5 Configurar n8n

1. Abrir `http://localhost:5678` y crear la cuenta de propietario (es local).
2. Crear una credencial de tipo **Postgres** con estos valores:

| Campo | Valor |
|---|---|
| Host | `postgres` |
| Database | `sigac` |
| User | el de `POSTGRES_USER` |
| Password | el de `POSTGRES_PASSWORD` |
| Port | `5432` |

> El host es `postgres` y el puerto `5432` porque n8n se conecta por la red
> interna de Docker. El `5433` solo aplica desde el equipo anfitrión.

3. Importar `workflows/WF-01_ingesta.json` (menú `...` → *Import from File*).
4. Asignar la credencial al nodo **Verifica token**.
5. Publicar el flujo con el botón **Publish**.

---

## 5. Uso

### Endpoint

```
POST http://localhost:5678/webhook/cita
```

### Cabeceras

```
Content-Type: application/json
X-SIGAC-Token: <token del rol recepcion>
```

### Cuerpo

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
  "fecha_preferida": "2026-08-17"
}
```

### Reglas de validación aplicadas

| Campo | Regla |
|---|---|
| `dpi` | Exactamente 13 dígitos |
| `telefono` | 8 dígitos, primer dígito entre 2 y 8 |
| `correo` | Formato de correo válido |
| `fecha_preferida` | Fecha válida y no anterior al día actual |
| `tipo_consulta` | `urgencia`, `control` o `general` |
| `nombre`, `apellido`, `fecha_nacimiento` | Obligatorios |

### Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | Solicitud aceptada |
| 400 | Los datos no superan la validación |
| 401 | Token ausente o inválido |
| 403 | El rol no autoriza la operación |

---

## 6. Pruebas

Hay dos URLs disponibles:

| URL | Cuándo usarla |
|---|---|
| `/webhook/cita` | Producción. Requiere el flujo **publicado**. Las ejecuciones aparecen en la pestaña *Executions*, no en el lienzo. |
| `/webhook-test/cita` | Prueba. Requiere pulsar **Listen for test event** antes de cada ejecución. Las ejecuciones se ven en el lienzo. |

Los ejemplos siguientes usan la URL de producción. Cargar antes las variables:

```bash
set -a; source .env; set +a
```

### CP-01 · Solicitud válida → 200

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320101","nombre":"Juan","apellido":"Perez","telefono":"55123456","correo":"juan@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"dolor","fecha_preferida":"2026-08-17"}'
```

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
  -d '{"dpi":"2547896320","nombre":"Juan","apellido":"Perez","telefono":"55123456","correo":"juan@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"dolor","fecha_preferida":"2026-08-17"}'
```

### CP-05 · Validación de negocio → 400

Fecha preferida en el pasado.

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:5678/webhook/cita \
  -H "Content-Type: application/json" \
  -H "X-SIGAC-Token: $SIGAC_TOKEN_RECEPCION" \
  -d '{"dpi":"2547896320101","nombre":"Juan","apellido":"Perez","telefono":"55123456","correo":"juan@correo.com","fecha_nacimiento":"1990-05-12","tipo_consulta":"general","motivo":"dolor","fecha_preferida":"2020-01-15"}'
```

Las evidencias de cada caso están en `evidencias/`.

---

## 7. Ciberseguridad implementada

| Capa | Control | Estado |
|---|---|---|
| 1 | Credenciales en variables de entorno; `.env` excluido del repositorio | Implementada |
| 2 | Autenticación por token (SHA-256, comparación hash contra hash) | Implementada |
| 2b | Autorización por rol: solo `recepcion` crea citas | Implementada |
| 5 | Validación estricta de entradas y enmascaramiento del DPI en la salida | Implementada |
| 3 | Cifrado AES-256-GCM en reposo | Fase 2 |
| 4 | Bitácora de auditoría encadenada por hash | Fase 2 |

Decisiones de arquitectura con impacto en seguridad:

- PostgreSQL y MailHog **no se exponen a la red local**: solo a `127.0.0.1`.
- El token nunca se compara en claro: se hashea y se contrasta contra
  `usuario_api.token_hash`.
- La autenticación (401) y la autorización (403) se resuelven en nodos separados:
  saber *quién es* el emisor no implica que pueda ejecutar la operación.
- Los mensajes de rechazo son genéricos: no revelan si el token existe pero
  está inactivo, ni si el rol es incorrecto.
- El DPI se enmascara (`*********0101`) antes de devolverlo o registrarlo.

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
│   └── WF-01_ingesta.json     flujo de ingesta de solicitudes
├── docs/                      documento tecnico y diagramas
└── evidencias/                capturas y resultados de las pruebas
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

| Entidad | Estado inicial | Estados posteriores |
|---|---|---|
| `solicitud_cita` | `pendiente` | `asignada` · `en_espera` · `rechazada` |
| `cita` | `confirmada` | `atendida` · `cancelada` · `ausente` |

El campo `paciente.dpi_huella` guarda un SHA-256 del DPI. Existe porque el
cifrado con IV aleatorio produce un texto distinto cada vez, lo que impediría
buscar o detectar duplicados sobre el campo cifrado.

---

## 10. Estado del proyecto

| Flujo | Descripción | Estado |
|---|---|---|
| WF-01 | Ingesta de solicitudes | Operativo (falta persistencia) |
| WF-00 | Manejador centralizado de errores | Pendiente |
| WF-02 | Clasificación y asignación | Pendiente |
| WF-03 | Notificación y expediente | Pendiente |
| WF-04 | Lista de espera y reasignación | Pendiente |
| WF-05 | Reporte semanal en PDF | Pendiente |

---

## 11. Detener el entorno

```bash
docker compose down          # detiene y elimina los contenedores
docker compose down -v       # además elimina los volúmenes (borra la base)
```