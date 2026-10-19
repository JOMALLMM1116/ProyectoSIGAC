-- SIGAC - DATOS DE PRUEBA

-- MEDICOS
insert into medico (nombre, especialidad, colegiado)
values
('Ana Lucia Morales Chub',    'Medicina General', 'CM-10245'),
('Carlos Enrique Coc Ical',   'Pediatria',        'CM-10388'),
('Silvia Beatriz Cu Pop',     'Medicina Interna', 'CM-10471');

-- DISPONIBILIDAD
-- dia_semana: 1 = lunes hasta 7 = domingo

insert into disponibilidad (id_medico, dia_semana, hora_inicio, hora_fin, cupos)
values
(1, 1, '08:00', '12:00', 4),
(1, 3, '08:00', '12:00', 4),
(1, 5, '14:00', '17:00', 3),
(2, 2, '08:00', '12:00', 5),
(2, 4, '08:00', '12:00', 5),
(3, 1, '14:00', '17:00', 3),
(3, 3, '14:00', '17:00', 3);


insert into usuario_api (rol, token_hash)
values
('recepcion', encode(sha256('PEGA_AQUI_TOKEN'::bytea), 'hex')),
('medico',    encode(sha256('PEGA_AQUI_TOKEN'::bytea),    'hex')),
('admin',     encode(sha256('PEGA_AQUI_TOKEN'::bytea),     'hex'));


select 'medico' as tabla, count(*) as filas from medico
union all
select 'disponibilidad', count(*) from disponibilidad
union all
select 'usuario_api', count(*) from usuario_api
union all
select 'bitacora_auditoria', count(*) from bitacora_auditoria;


-- ============================================================
-- ============================================================
--
--   CAMBIOS Y ALTERACIONES POSTERIORES
--   Octubre de 2026
--
--   Todo lo que sigue se agrego despues de la carga inicial.
--   Se mantiene separado y no integrado arriba, para que el
--   historial del diseno quede legible: lo de arriba es la
--   semilla con la que nacio el sistema en agosto, lo de abajo
--   es lo que el analisis por roles hizo evidente en octubre.
--
-- ============================================================
-- ============================================================


-- ------------------------------------------------------------
-- CAMBIO 1 - DOS MEDICOS MAS Y UNA CUARTA ESPECIALIDAD
--
-- Medicina General queda con dos medicos porque es el de primer
-- contacto: recibe toda solicitud que no indique especialidad,
-- de modo que es el que mas carga soporta. Tener dos ademas
-- permite probar el criterio de reparto, que asigna al medico
-- con menos citas ese dia.
--
-- Las demas especialidades quedan con uno. Ginecologia se
-- agrega como cuarta especialidad para que el filtro por
-- especialidad tenga sentido real y no sea decorativo.
-- ------------------------------------------------------------

insert into medico (nombre, especialidad, colegiado)
values
('Luis Fernando Caal Xol',  'Medicina General', 'CM-10536'),
('Marta Elena Tzub Quej',   'Ginecologia',      'CM-10612');


-- ------------------------------------------------------------
-- CAMBIO 2 - DISPONIBILIDAD REGULAR CON HORARIO PARTIDO
--
-- La carga inicial daba a cada medico dos o tres dias sueltos y
-- una sola franja. Esto la reemplaza por un horario regular de
-- lunes a viernes con dos franjas diarias.
--
-- EL HUECO DEL ALMUERZO NO SE PROGRAMA, SE OMITE. No existe
-- ninguna franja entre las 12:00 y las 13:30, de modo que el
-- sistema sencillamente no puede asignar una cita ahi. No hace
-- falta logica adicional para impedirlo.
--
-- Las dos franjas se corresponden exactamente con la franja
-- preferida que el paciente puede indicar al pedir su cita:
-- manana es la de 08:00 a 12:00, tarde la de 13:30 a 17:00.
--
-- EL MIERCOLES LLEVA CUPOS REDUCIDOS A PROPOSITO. Es el dia mas
-- dificil de pedir permiso en el trabajo, de modo que resulta
-- creible que una clinica tenga menos cobertura. Y permite
-- demostrar la lista de espera y la reasignacion de cupos sin
-- tener que inundar el sistema de solicitudes: con cinco
-- medicos son 20 cupos ese dia frente a 75 del resto.
--
-- Los horarios son hipoteticos. En una clinica real se
-- ajustarian a los suyos sin cambiar nada del diseno.
-- ------------------------------------------------------------

delete from disponibilidad;

insert into disponibilidad (id_medico, dia_semana, hora_inicio, hora_fin, cupos)
select m.id, h.dia, h.inicio, h.fin, h.cupos
from medico m
cross join (values
    (1, time '08:00', time '12:00', 8),
    (1, time '13:30', time '17:00', 7),
    (2, time '08:00', time '12:00', 8),
    (2, time '13:30', time '17:00', 7),
    (3, time '08:00', time '12:00', 2),
    (3, time '13:30', time '17:00', 2),
    (4, time '08:00', time '12:00', 8),
    (4, time '13:30', time '17:00', 7),
    (5, time '08:00', time '12:00', 8),
    (5, time '13:30', time '17:00', 7)
) as h(dia, inicio, fin, cupos)
where m.activo = true;


-- VERIFICACION DE LOS CAMBIOS

-- cinco medicos, cuatro especialidades
select id, nombre, especialidad, colegiado
from medico
order by id;

-- cincuenta filas: cinco medicos por cinco dias por dos franjas
select count(*) as filas_disponibilidad from disponibilidad;

-- el miercoles debe mostrar 20 cupos frente a 75 de los demas dias
select dia_semana, sum(cupos) as cupos_dia
from disponibilidad
group by dia_semana
order by dia_semana;

-- las solicitudes que ya existian deben haber tomado el valor
-- por defecto de franja_preferida
select franja_preferida, count(*) as solicitudes
from solicitud_cita
group by franja_preferida;
