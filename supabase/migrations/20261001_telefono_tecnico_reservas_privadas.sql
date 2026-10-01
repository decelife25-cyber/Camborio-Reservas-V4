-- Reservas privadas sin teléfono: identificador técnico interno y cliente asociado.
create sequence if not exists public.cr_reservas_sin_telefono_seq start 1 increment 1 minvalue 1;

create unique index if not exists "Clientes_Telefono_unique_nonnull"
on public."Clientes" ("Telefono")
where "Telefono" is not null and btrim("Telefono") <> '';

create or replace function public.cr_reservas_generar_identificadores()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_bytes bytea;
  v_i integer;
  v_telefono text;
  v_cliente_id uuid;
begin
  if new."ReservaID" is null then
    new."ReservaID" := gen_random_uuid();
  end if;

  if nullif(trim(new."CodigoReserva"), '') is null then
    loop
      v_bytes := decode(md5(random()::text || clock_timestamp()::text || new."ReservaID"::text), 'hex');
      v_codigo := '';
      for v_i in 0..5 loop
        v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, v_i) % 32) + 1, 1);
      end loop;
      exit when not exists (select 1 from public."Reservas" r where r."CodigoReserva" = v_codigo);
    end loop;
    new."CodigoReserva" := v_codigo;
  end if;

  if upper(coalesce(new."OrigenReserva", '')) = 'PRIVADO'
     and nullif(btrim(coalesce(new."Telefono", '')), '') is null then
    v_telefono := lpad(nextval('public.cr_reservas_sin_telefono_seq')::text, 9, '0');
    new."Telefono" := v_telefono;

    if new."ClienteID" is null then
      insert into public."Clientes"
        ("ClienteID","Telefono","NombreUltimo","EmailUltimo","ReservasTotales","Confirmadas","Sentadas","Canceladas","NoPresentados","FechaAlta")
      values
        (gen_random_uuid(),v_telefono,nullif(btrim(new."Nombre"),''),nullif(btrim(new."Email"),''),0,0,0,0,0,now())
      returning "ClienteID" into v_cliente_id;
      new."ClienteID" := v_cliente_id;
    end if;
  end if;

  return new;
end;
$function$;
