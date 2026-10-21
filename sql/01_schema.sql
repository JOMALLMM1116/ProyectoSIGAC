-- DOMINIO 1: CONTROL DE ACCESO
-- guarda los tokens hasheados, nunca el token en claro

create table usuario_api(
    id          int          generated always as identity primary key,
    rol         varchar(20)  not null,
    token_hash  char(64)     not null unique,
    activo      boolean      not null default true,
    creado_en   timestamptz  not null default now(),
    constraint ckusuario_rol check (rol in ('recepcion', 'medico', 'admin'))
);

-- DOMINIO 2: OPERATIVO

-- el dpi va cifrado, pero el cifrado usa IV aleatorio: dos cifrados
-- del mismo dpi dan textos distintos. por eso se guarda tambien una
-- huella sha-256 fija, que permite buscar y evitar duplicados
-- sin descifrar nada.
create table paciente(
    id                int          generated always as identity primary key,
    dpi_cifrado       text         not null,
    dpi_huella        char(64)     not null unique,
    nombre            varchar(60)  not null,
    apellido          varchar(60)  not null,
    telefono_cifrado  text         null,
    fecha_nacimiento  date         not null,
    correo            varchar(120) not null,
    activo            boolean      not null default true,
    creado_en         timestamptz  not null default now()
);

create table medico(
    id            int          generated always as identity primary key,
    nombre        varchar(120) not null,
    especialidad  varchar(60)  not null,
    colegiado     varchar(20)  not null unique,
    activo        boolean      not null default true,
    creado_en     timestamptz  not null default now()
);

-- horario en que cada medico atiende. dia_semana usa el estandar ISO:
-- 1 = lunes hasta 7 = domingo
create table disponibilidad(
    id           int      generated always as identity primary key,
    id_medico    int      not null,
    dia_semana   smallint not null,
    hora_inicio  time     not null,
    hora_fin     time     not null,
    cupos        smallint not null default 1,
    constraint fkdisponibilidad_medico foreign key (id_medico) references medico(id),
    constraint ckdisp_dia   check (dia_semana between 1 and 7),
    constraint ckdisp_horas check (hora_fin > hora_inicio),
    constraint ckdisp_cupos check (cupos > 0)
);

-- la solicitud es lo que entra por el webhook. todavia no es una cita:
-- WF-02 la clasifica y decide si se asigna o pasa a lista de espera
create table solicitud_cita(
    id               int          generated always as identity primary key,
    id_paciente      int          not null,
    tipo_consulta    varchar(20)  not null,
    motivo           varchar(255) null,
    prioridad        smallint     null,
    estado           varchar(15)  not null default 'pendiente',
    fecha_preferida  date         not null,
    creado_en        timestamptz  not null default now(),
    constraint fksolicitud_paciente foreign key (id_paciente) references paciente(id),
    constraint cksol_tipo      check (tipo_consulta in ('urgencia', 'control', 'general')),
    constraint cksol_estado    check (estado in ('pendiente', 'asignada', 'en_espera', 'rechazada')),
    constraint cksol_prioridad check (prioridad is null or prioridad between 1 and 5)
);

-- un medico no puede tener dos citas vigentes a la misma hora. la regla
-- vive en la base y no solo en el flujo, para que ninguna via de entrada
-- pueda saltarsela.
create table cita(
    id            int          generated always as identity primary key,
    id_solicitud  int          not null unique,
    id_paciente   int          not null,
    id_medico     int          not null,
    fecha_hora    timestamptz  not null,
    estado        varchar(15)  not null default 'confirmada',
    notificada    boolean      not null default false,
    creado_en     timestamptz  not null default now(),
    constraint fkcita_solicitud foreign key (id_solicitud) references solicitud_cita(id),
    constraint fkcita_paciente  foreign key (id_paciente)  references paciente(id),
    constraint fkcita_medico    foreign key (id_medico)    references medico(id),
    constraint ckcita_estado    check (estado in ('confirmada', 'atendida', 'cancelada', 'ausente'))
);

-- la unicidad de medico + fecha_hora excluye las canceladas: al cancelar,
-- el horario vuelve a quedar libre y WF-04 lo reasigna al siguiente en
-- lista de espera. va como indice parcial y no como constraint unique
-- porque PostgreSQL no admite where dentro de una restriccion de tabla.
create unique index uqcita_medico_horario
  on cita (id_medico, fecha_hora)
  where estado <> 'cancelada';

create table expediente(
    id                    int          generated always as identity primary key,
    id_paciente           int          not null,
    id_cita               int          not null unique,
    diagnostico_cifrado   text         null,
    indicaciones_cifrado  text         null,
    creado_por            varchar(20)  not null,
    creado_en             timestamptz  not null default now(),
    constraint fkexpediente_paciente foreign key (id_paciente) references paciente(id),
    constraint fkexpediente_cita     foreign key (id_cita)     references cita(id)
);

-- cola de solicitudes sin cupo. WF-04 la consulta cuando se cancela
-- una cita, ordenando por prioridad y luego por antiguedad
create table lista_espera(
    id            int         generated always as identity primary key,
    id_solicitud  int         not null unique,
    prioridad     smallint    not null,
    posicion      int         null,
    atendida      boolean     not null default false,
    creado_en     timestamptz not null default now(),
    constraint fkespera_solicitud foreign key (id_solicitud) references solicitud_cita(id),
    constraint ckespera_prioridad check (prioridad between 1 and 5)
);

-- DOMINIO 3: TRAZABILIDAD

-- bitacora encadenada: cada fila guarda el hash de la anterior.
-- funciona como los eslabones de una cadena: si alguien altera un
-- registro por dentro, el eslabon siguiente ya no calza y se detecta.
--
-- el catalogo de acciones va amplio a proposito. un check corto se
-- rompe apenas la aplicacion quiere registrar algo que no estaba
-- previsto (ya me paso con LOGIN_EXITOSO en tbAuditoria).
create table bitacora_auditoria(
    id                  bigint       generated always as identity primary key,
    tabla_afectada      varchar(40)  not null,
    id_registro         int          null,
    accion              varchar(20)  not null,
    rol                 varchar(20)  null,
    datos_enmascarados  text         null,
    hash_anterior       char(64)     not null,
    hash_actual         char(64)     not null,
    creado_en           timestamptz  not null default now(),
    constraint ckbitacora_accion check (accion in (
        'insert', 'update', 'delete', 'select',
        'login', 'rechazo', 'reasignacion', 'notificacion',
        'reporte', 'genesis'
    ))
);

create table log_errores(
    id                   bigint       generated always as identity primary key,
    workflow             varchar(40)  not null,
    nodo                 varchar(60)  null,
    mensaje              text         not null,
    payload_enmascarado  text         null,
    severidad            varchar(10)  not null default 'media',
    creado_en            timestamptz  not null default now(),
    constraint cklog_severidad check (severidad in ('baja', 'media', 'alta'))
);

-- INDICES
-- los parciales (con where) solo indexan las filas que se
-- consultan de verdad: pesan menos y responden mas rapido

create index ixsolicitud_estado   on solicitud_cita (estado, creado_en);
create index ixcita_sin_notificar on cita (notificada) where notificada = false;
create index ixcita_medico_fecha  on cita (id_medico, fecha_hora);
create index ixespera_orden       on lista_espera (prioridad, creado_en) where atendida = false;
create index ixbitacora_fecha     on bitacora_auditoria (creado_en);
create index ixlog_severidad      on log_errores (severidad, creado_en);

-- SEMILLA DE LA CADENA DE AUDITORIA
-- el primer eslabon no tiene anterior, asi que su hash_anterior
-- va en ceros. sin esta fila el primer registro real no tendria
-- contra que encadenar.

insert into bitacora_auditoria
    (tabla_afectada, id_registro, accion, rol, datos_enmascarados, hash_anterior, hash_actual)
values
    ('sistema', null, 'genesis', 'admin', 'inicio de cadena',
     repeat('0', 64),
     encode(sha256('genesis'::bytea), 'hex'));


-- ============================================================
-- ============================================================
--
--   CAMBIOS Y ALTERACIONES POSTERIORES
--   Octubre de 2026
--
--   Todo lo que sigue se agrego despues de la version inicial
--   del esquema. Se mantiene separado y no integrado arriba,
--   para que el historial del diseno quede legible: lo de
--   arriba es lo que se penso en agosto, lo de abajo es lo que
--   el analisis por roles hizo evidente en octubre.
--
-- ============================================================
-- ============================================================


-- ------------------------------------------------------------
-- CAMBIO 1 - PREFERENCIAS DEL PACIENTE
--
-- Hasta aqui el sistema decidia por completo el medico y el
-- horario de cada cita. El paciente solo elegia la fecha.
--
-- En la practica eso significa que el sistema asigna el primer
-- cupo libre del dia, de modo que todas las citas empiezan a
-- las 08:00 hasta llenar la manana. Un paciente que trabaja y
-- solo puede por la tarde recibe una cita a las 08:30, no puede
-- asistir, y el sistema registra una ausencia que el mismo
-- provoco.
--
-- Estos cuatro campos permiten que el paciente exprese lo que
-- si tiene decidido. Los cuatro son opcionales a proposito:
-- su ausencia es lo que le indica al sistema que debe decidir
-- el. El principio es que el sistema resuelve unicamente lo
-- que el paciente no resolvio.
-- ------------------------------------------------------------

alter table solicitud_cita
  add column franja_preferida        varchar(12) not null default 'indiferente',
  add column hora_solicitada         time        null,
  add column especialidad_solicitada varchar(60) null,
  add column id_medico_solicitado    int         null;

-- franja_preferida lleva check porque sus valores son cerrados y
-- no van a cambiar. especialidad_solicitada no lo lleva: un
-- catalogo de especialidades crece, y un check se rompe apenas
-- se agrega una. Esa validacion vive en WF-01, contrastando
-- contra las especialidades que existen en la tabla medico.
alter table solicitud_cita
  add constraint cksol_franja
    check (franja_preferida in ('manana', 'tarde', 'indiferente')),
  add constraint fksol_medico_solicitado
    foreign key (id_medico_solicitado) references medico(id);

-- indice para la consulta de huecos libres, que la recepcionista
-- ejecuta mientras negocia un horario con el paciente al telefono
create index ixsolicitud_fecha_franja
  on solicitud_cita (fecha_preferida, franja_preferida)
  where estado in ('pendiente', 'en_espera');


-- ------------------------------------------------------------
-- CAMBIO 2 - NOTA CLINICA
--
-- El planteamiento del problema declara que no existe
-- trazabilidad sobre quien consulta o modifica un expediente.
-- Hasta aqui esa promesa no se cumplia: el sistema abre un
-- expediente por cada cita y lo deja vacio para siempre, de
-- modo que no hay nada que consultar ni modificar.
--
-- Esta tabla es el contenido clinico que faltaba. Cada entrada
-- la escribe un medico, va cifrada con AES-256-GCM igual que el
-- DPI, y queda firmada con quien la escribio y cuando.
--
-- INMUTABLE POR DISENO. Ningun flujo ejecuta update ni delete
-- sobre esta tabla. Un diagnostico no se corrige: se agrega otro
-- que lo matiza o lo contradice, y ambos quedan. Es como
-- funciona un expediente real, y es lo que hace legible el
-- recorrido de un paciente entre varios medicos.
--
-- La garantia no esta declarada en la base, porque PostgreSQL
-- no permite prohibir el update sin un trigger. Esta en que
-- ninguna operacion la modifica. Es una decision, no un
-- descuido.
-- ------------------------------------------------------------

create table nota_clinica(
    id                    int          generated always as identity primary key,
    id_expediente         int          not null,
    id_paciente           int          not null,
    id_cita               int          not null,
    id_medico             int          not null,
    diagnostico_cifrado   text         null,
    indicaciones_cifrado  text         null,
    creado_en             timestamptz  not null default now(),
    constraint fknota_expediente foreign key (id_expediente) references expediente(id),
    constraint fknota_paciente   foreign key (id_paciente)   references paciente(id),
    constraint fknota_cita       foreign key (id_cita)       references cita(id),
    constraint fknota_medico     foreign key (id_medico)     references medico(id)
);

-- la consulta que importa es el historial de un paciente en
-- orden cronologico: es lo que un medico lee antes de entrar a
-- la consulta, y lo que permite que un especialista vea lo que
-- el medico general diagnostico e indico.
create index ixnota_paciente on nota_clinica (id_paciente, creado_en);

-- Los dos campos cifrados de la tabla expediente quedan nulos de
-- forma permanente. El diseno original los contemplaba, y el
-- modelo evoluciono hacia notas multiples por paciente. Se dejan
-- declarados en lugar de eliminarse, porque explican la historia
-- del diseno: expediente sigue siendo el registro de que el
-- expediente se abrio, y nota_clinica es su contenido.


-- VERIFICACION

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'solicitud_cita'
order by ordinal_position;

select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'nota_clinica'
order by ordinal_position;

select * from bitacora_auditoria;


-- ============================================================

-- ------------------------------------------------------------
-- CAMBIO 3 - AVISO DE LISTA DE ESPERA
--
-- Hasta aqui, la solicitud que no encontraba cupo pasaba a la
-- cola en silencio. El paciente colgaba el telefono creyendo
-- que tenia cita, y solo se enteraba si alguien cancelaba y le
-- llegaba la notificacion.
--
-- Este campo cumple en lista_espera la misma funcion que
-- notificada en cita: evita que el temporizador reenvie el
-- mismo aviso cada cinco minutos.
-- ------------------------------------------------------------

alter table lista_espera
  add column notificada boolean not null default false;

create index ixespera_sin_notificar
  on lista_espera (notificada)
  where notificada = false and atendida = false;


-- ------------------------------------------------------------
-- CAMBIO 4 - IDENTIDAD DEL MEDICO EN EL TOKEN
--
-- Hasta aqui el control de acceso era por rol, no por persona:
-- habia un solo token de medico, compartido por todos. Alcanzaba
-- para WF-05, porque cerrar una cita solo exige saber que quien
-- llama es un medico.
--
-- La nota clinica exige mas. Cada nota va firmada con id_medico,
-- y esa firma es lo que hace util el historial: que el
-- especialista vea que la nota del lunes la escribio la medica
-- general y no otro. Con un token compartido el sistema sabe que
-- un medico escribio, pero no cual.
--
-- Se descartaron dos alternativas:
--   - Recibir id_medico en el cuerpo de la peticion. Cualquiera
--     con el token de medico podria firmar a nombre de otro.
--   - Firmar con el medico asignado a la cita. Asume que quien
--     atiende es siempre el asignado; si un medico cubre a otro,
--     la nota queda firmada por quien no la escribio.
--
-- La solucion es que el token identifique a la persona: cada
-- medico recibe su propio token, vinculado a su registro. La
-- firma sale del token y no puede falsificarse desde la peticion.
-- Ademas permite auditar que medico leyo un historial, y no solo
-- que alguien con rol medico lo hizo.
-- ------------------------------------------------------------

alter table usuario_api
  add column id_medico int null;

alter table usuario_api
  add constraint fkusuario_medico
    foreign key (id_medico) references medico(id);

-- solo un token de rol medico puede llevar id_medico. recepcion y
-- admin no son personas del catalogo de medicos.
alter table usuario_api
  add constraint ckusuario_medico
    check (id_medico is null or rol = 'medico');

-- un solo token activo por medico. rotar un token es desactivar
-- el anterior e insertar el nuevo; el viejo queda como rastro.
create unique index uqusuario_medico_activo
  on usuario_api (id_medico)
  where activo;


-- ------------------------------------------------------------
-- CAMBIO 5 - ADMINISTRACION DE PERSONAS
--
-- Hasta aqui el rol admin solo recibia alertas y reportes. Dar
-- de alta a un medico, suspender a un paciente o retirar a una
-- recepcionista se hacia a mano en la base, sin validacion ni
-- registro en la bitacora.
--
-- Tres estados posibles para cada persona:
--   activo    activo = true,  baja_en nulo
--   inactivo  activo = false, baja_en nulo     (reversible)
--   baja      activo = false, baja_en con fecha (definitiva)
--
-- La baja es logica y no un delete. Un paciente con citas tiene
-- expediente y notas clinicas inmutables, y la bitacora guarda
-- el id de esas filas. Borrarlo romperia las llaves foraneas o
-- dejaria eslabones de la cadena apuntando a nada.
--
-- Se conserva el booleano activo en lugar de reemplazarlo por un
-- campo estado, para no romper los flujos que ya lo leen.
--
-- Que la baja sea irreversible no esta declarado en la base:
-- requeriria un trigger. Lo garantiza el flujo de administracion,
-- que rechaza reactivar a quien tiene baja_en. Misma decision que
-- la inmutabilidad de nota_clinica.
-- ------------------------------------------------------------

alter table paciente
  add column baja_en timestamptz null;

alter table medico
  add column baja_en timestamptz null;

-- una persona dada de baja no puede seguir activa
alter table paciente
  add constraint ckpaciente_baja check (baja_en is null or not activo);

alter table medico
  add constraint ckmedico_baja check (baja_en is null or not activo);

-- hasta aqui la recepcionista no existia como persona: era solo
-- una fila de usuario_api con rol recepcion. No habia a quien
-- suspender, solo un token. Esta tabla le da identidad, con la
-- misma forma que medico.
create table recepcionista(
    id         int          generated always as identity primary key,
    nombre     varchar(120) not null,
    activo     boolean      not null default true,
    baja_en    timestamptz  null,
    creado_en  timestamptz  not null default now(),
    constraint ckrecepcionista_baja check (baja_en is null or not activo)
);

-- mismo patron que el cambio 4: el token identifica a la persona
alter table usuario_api
  add column id_recepcionista int null;

alter table usuario_api
  add constraint fkusuario_recepcionista
    foreign key (id_recepcionista) references recepcionista(id);

alter table usuario_api
  add constraint ckusuario_recepcionista
    check (id_recepcionista is null or rol = 'recepcion');

create unique index uqusuario_recepcionista_activo
  on usuario_api (id_recepcionista)
  where activo;
