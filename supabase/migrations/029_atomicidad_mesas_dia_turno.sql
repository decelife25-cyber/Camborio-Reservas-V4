-- Atomicidad de asignación/ocupación de mesas por contexto día+turno.
-- Serializa las operaciones del mismo contexto con pg_advisory_xact_lock
-- y vuelve a comprobar la colisión dentro de la misma transacción.

create or replace function public.cr_asignar_mesas_atomico(
  p_reserva_id uuid, p_fecha date, p_turno text, p_mesa text,
  p_mesas_adicionales text, p_zona text, p_estado text
)
returns public."Reservas"
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reserva public."Reservas"%rowtype;
  v_selected text[];
  v_conflict_mesa text;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(coalesce(p_fecha::text, '') || '|' || upper(trim(coalesce(p_turno, ''))), 0)
  );

  select * into v_reserva from public."Reservas"
   where "ReservaID" = p_reserva_id for update;

  if not found then
    raise exception 'CR_RESERVA_NO_ENCONTRADA: reserva no encontrada.';
  end if;

  if v_reserva."FechaReserva" is distinct from p_fecha
     or upper(trim(coalesce(v_reserva."Turno", ''))) <> upper(trim(coalesce(p_turno, ''))) then
    raise exception 'CR_CONTEXTO_RESERVA: la reserva no pertenece al día y turno indicados.';
  end if;

  select array_agg(distinct trim(x)) into v_selected
    from regexp_split_to_table(
      concat_ws(',', nullif(trim(p_mesa), ''), nullif(trim(p_mesas_adicionales), '')), ','
    ) as x
   where trim(x) <> '';

  if upper(trim(coalesce(p_estado, ''))) in ('PENDIENTE', 'CONFIRMADA', 'SENTADA')
     and coalesce(array_length(v_selected, 1), 0) > 0 then
    select trim(mesa) into v_conflict_mesa
      from public."Reservas" r
      cross join lateral regexp_split_to_table(
        concat_ws(',', nullif(trim(r."Mesa"), ''), nullif(trim(r."MesasAdicionales"), '')), ','
      ) as mesa
     where r."ReservaID" <> p_reserva_id
       and r."FechaReserva" = p_fecha
       and upper(trim(coalesce(r."Turno", ''))) = upper(trim(coalesce(p_turno, '')))
       and r."Estado" in ('PENDIENTE', 'CONFIRMADA', 'SENTADA')
       and trim(mesa) = any(v_selected)
     limit 1;

    if v_conflict_mesa is not null then
      raise exception 'CR_COLISION_MESA: la mesa % ya está asignada a otra reserva para este día y turno.', v_conflict_mesa;
    end if;
  end if;

  update public."Reservas"
     set "Mesa" = nullif(trim(p_mesa), ''),
         "MesasAdicionales" = nullif(trim(p_mesas_adicionales), ''),
         "Zona" = nullif(trim(p_zona), ''),
         "Turno" = upper(trim(p_turno)),
         "Estado" = upper(trim(p_estado)),
         "FechaModificacion" = now()
   where "ReservaID" = p_reserva_id
   returning * into v_reserva;

  return v_reserva;
end;
$$;

create or replace function public.cr_ocupar_mesa_atomico(
  p_fecha date, p_turno text, p_mesa text, p_zona text, p_usuario text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reserva_id uuid;
  v_conflict_mesa text;
begin
  perform pg_advisory_xact_lock(
    hashtextextended(coalesce(p_fecha::text, '') || '|' || upper(trim(coalesce(p_turno, ''))), 0)
  );

  select trim(mesa) into v_conflict_mesa
    from public."Reservas" r
    cross join lateral regexp_split_to_table(
      concat_ws(',', nullif(trim(r."Mesa"), ''), nullif(trim(r."MesasAdicionales"), '')), ','
    ) as mesa
   where r."FechaReserva" = p_fecha
     and upper(trim(coalesce(r."Turno", ''))) = upper(trim(coalesce(p_turno, '')))
     and r."Estado" in ('PENDIENTE', 'CONFIRMADA', 'SENTADA')
     and trim(mesa) = trim(p_mesa)
   limit 1;

  if v_conflict_mesa is not null then
    raise exception 'CR_COLISION_MESA: la mesa % ya está asignada a otra reserva para este día y turno.', v_conflict_mesa;
  end if;

  insert into public."Reservas" (
    "CodigoReserva","FechaCreacion","FechaReserva","HoraReserva","Nombre","Telefono","Email",
    "Personas","Observaciones","Estado","FechaEstado","UsuarioEstado","Mesa","Zona","ClienteID",
    "FechaModificacion","OrigenReserva","CreadaPor","MesasAdicionales","Turno"
  ) values (
    null,now(),p_fecha,localtime,'SIN RESERVA',null,null,1,null,'SENTADA',now(),p_usuario,
    trim(p_mesa),upper(trim(p_zona)),null,now(),'PRIVADO',p_usuario,null,upper(trim(p_turno))
  )
  returning "ReservaID" into v_reserva_id;

  return v_reserva_id;
end;
$$;

grant execute on function public.cr_asignar_mesas_atomico(uuid,date,text,text,text,text,text) to authenticated;
grant execute on function public.cr_ocupar_mesa_atomico(date,text,text,text,text) to authenticated;