-- Genera los identificadores que necesita cualquier alta directa de Reservas.
create unique index if not exists "Reservas_CodigoReserva_unique"
  on public."Reservas" ("CodigoReserva")
  where "CodigoReserva" is not null;

create or replace function public.cr_reservas_generar_identificadores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_codigo text;
  v_bytes bytea;
  v_i integer;
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
      exit when not exists (
        select 1 from public."Reservas" r
        where r."CodigoReserva" = v_codigo
      );
    end loop;
    new."CodigoReserva" := v_codigo;
  end if;

  return new;
end;
$$;

drop trigger if exists "Reservas_generar_identificadores_before_insert" on public."Reservas";
create trigger "Reservas_generar_identificadores_before_insert"
before insert on public."Reservas"
for each row
execute function public.cr_reservas_generar_identificadores();
