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

-- la restriccion unica de medico + fecha_hora impide doble asignacion
-- del mismo medico a la misma hora, a nivel de base y no solo de flujo
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
    constraint ckcita_estado    check (estado in ('confirmada', 'atendida', 'cancelada', 'ausente')),
    constraint uqcita_medico_horario unique (id_medico, fecha_hora)
);

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

-- VERIFICACION

select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

select * from bitacora_auditoria;