-- Extension pg_net is required to make HTTP requests from triggers
create extension if not exists pg_net with schema extensions;

-- Attempt to create the vault extension (fails gracefully if already exists)
create extension if not exists supabase_vault with schema vault;

create or replace function public.cr_notificar_cambio_pendientes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_webhook_secret text;
begin
  -- Only trigger if Estado is involved and changes to/from PENDIENTE
  if TG_OP = 'UPDATE' then
    -- Handle potential NULLs safely
    if (new."Estado" is not distinct from old."Estado") then
      return new;
    end if;
    if coalesce(new."Estado", '') <> 'PENDIENTE' and coalesce(old."Estado", '') <> 'PENDIENTE' then
      return new;
    end if;
  end if;

  if TG_OP = 'INSERT' and coalesce(new."Estado", '') <> 'PENDIENTE' then
    return new;
  end if;

  if TG_OP = 'DELETE' and coalesce(old."Estado", '') <> 'PENDIENTE' then
    return old;
  end if;

  -- The Edge Function URL in production.
  v_url := coalesce(current_setting('app.settings.edge_function_url', true), 'https://caeszgtogifserrxdrcw.supabase.co/functions/v1/sync-badge');

  -- Retrieve webhook secret securely from vault
  begin
    select decrypted_secret into v_webhook_secret
    from vault.decrypted_secrets
    where name = 'webhook_secret'
    limit 1;
  exception when others then
    v_webhook_secret := null;
  end;

  -- Use pg_net asynchronously so we don't block the database transaction
  -- net.http_post returns a bigint request ID without waiting for the response.
  if v_webhook_secret is not null then
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_webhook_secret
      ),
      body := '{}'::jsonb
    );
  end if;

  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists "cr_reservas_badge_trigger" on public."Reservas";
create trigger "cr_reservas_badge_trigger"
after insert or update or delete on public."Reservas"
for each row
execute function public.cr_notificar_cambio_pendientes();
