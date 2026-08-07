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