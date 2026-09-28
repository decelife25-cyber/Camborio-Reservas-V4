create or replace function public.cr_guardar_horarios(p_horarios jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  r jsonb;
  servicio text;
  dia text;
  hora text;
  margen numeric;
  activo boolean;
begin
  if jsonb_typeof(p_horarios) <> 'array' then
    raise exception 'p_horarios debe ser un array JSON';
  end if;

  for r in select * from jsonb_array_elements(p_horarios) loop
    servicio := upper(trim(r->>'Servicio'));
    dia := trim(r->>'DiaSemana');
    hora := trim(r->>'Hora');
    margen := nullif(r->>'MargenHoras','')::numeric;
    activo := coalesce((r->>'Activo')::boolean, false);

    if servicio not in ('COMIDA','CENA') then
      raise exception 'Servicio no válido: %', servicio;
    end if;
    if dia is null or dia = '' or hora is null or hora = '' then
      raise exception 'Horario incompleto';
    end if;
    if margen is null or margen < 0 or margen > 999.99 then
      raise exception 'MargenHoras no válido: %', margen;
    end if;
  end loop;

  delete from public."Horarios"
  where upper(trim("Servicio")) in ('COMIDA','CENA');

  insert into public."Horarios" ("DiaSemana","Servicio","Hora","MargenHoras","Activo")
  select
    trim(r->>'DiaSemana'),
    upper(trim(r->>'Servicio')),
    (trim(r->>'Hora'))::time,
    nullif(r->>'MargenHoras','')::numeric,
    coalesce((r->>'Activo')::boolean, false)
  from jsonb_array_elements(p_horarios) r;
end;
$$;

grant execute on function public.cr_guardar_horarios(jsonb) to authenticated;
