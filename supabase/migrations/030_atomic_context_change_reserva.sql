-- Atomic context change for an existing reservation with assigned tables.
create or replace function public.cr_actualizar_contexto_reserva_atomico(
  p_reserva_id uuid, p_fecha date, p_hora time, p_turno text,
  p_personas integer, p_observaciones text, p_mantener_mesas boolean
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
  v_old_key text;
  v_new_key text;
begin
  select * into v_reserva from public."Reservas" where "ReservaID" = p_reserva_id for update;
  if not found then raise exception 'CR_RESERVA_NO_ENCONTRADA: reserva no encontrada.'; end if;
  if upper(trim(coalesce(p_turno, ''))) not in ('COMIDA', 'CENA') then
    raise exception 'CR_TURNO_INVALIDO: turno no válido.';
  end if;

  v_old_key := coalesce(v_reserva."FechaReserva"::text, '') || '|' || upper(trim(coalesce(v_reserva."Turno", '')));
  v_new_key := coalesce(p_fecha::text, '') || '|' || upper(trim(coalesce(p_turno, '')));

  if v_old_key <= v_new_key then
    perform pg_advisory_xact_lock(hashtextextended(v_old_key, 0));
    if v_new_key <> v_old_key then perform pg_advisory_xact_lock(hashtextextended(v_new_key, 0)); end if;
  else
    perform pg_advisory_xact_lock(hashtextextended(v_new_key, 0));
    perform pg_advisory_xact_lock(hashtextextended(v_old_key, 0));
  end if;

  select array_agg(distinct trim(x)) into v_selected
    from regexp_split_to_table(
      concat_ws(',', nullif(trim(v_reserva."Mesa"), ''), nullif(trim(v_reserva."MesasAdicionales"), '')), ','
    ) as x
   where trim(x) <> '';

  if p_mantener_mesas
     and (v_reserva."FechaReserva" is distinct from p_fecha
          or upper(trim(coalesce(v_reserva."Turno", ''))) <> upper(trim(coalesce(p_turno, ''))))
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
     set "FechaReserva" = p_fecha, "HoraReserva" = p_hora, "Personas" = p_personas,
         "Observaciones" = p_observaciones, "Turno" = upper(trim(p_turno)),
         "Mesa" = case when p_mantener_mesas then "Mesa" else null end,
         "MesasAdicionales" = case when p_mantener_mesas then "MesasAdicionales" else null end,
         "Zona" = case when p_mantener_mesas then "Zona" else null end,
         "FechaModificacion" = now()
   where "ReservaID" = p_reserva_id
   returning * into v_reserva;
  return v_reserva;
end;
$$;

grant execute on function public.cr_actualizar_contexto_reserva_atomico(uuid,date,time,text,integer,text,boolean) to authenticated;
