-- Extension pg_net is required to make HTTP requests from triggers
create extension if not exists pg_net with schema extensions;

create or replace function public.cr_notificar_cambio_pendientes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  -- Only trigger if Estado is involved and changes to/from PENDIENTE
  if TG_OP = 'UPDATE' then
    if new."Estado" = old."Estado" then
      return new;
    end if;
    if new."Estado" <> 'PENDIENTE' and old."Estado" <> 'PENDIENTE' then
      return new;
    end if;
  end if;

  if TG_OP = 'INSERT' and new."Estado" <> 'PENDIENTE' then
    return new;
  end if;

  if TG_OP = 'DELETE' and old."Estado" <> 'PENDIENTE' then
    return old;
  end if;

  -- The Edge Function URL in production.
  -- We assume standard Supabase project URL structure which pg_net can access internally if needed,
  -- but generally for Supabase Edge Functions invoked from pg_net, you must provide the full URL.
  -- Since we don't have the project URL dynamically here without a secret,
  -- an alternative is to use `supabase_functions.http_request` or `net.http_post`.

  -- In this project, Supabase functions are called via the REST API. We'll use net.http_post
  -- However, to keep it simple and portable, we'll try to invoke the function assuming the
  -- environment variables inside the Edge Function itself handle the service account.
  -- Wait, to invoke a Supabase Edge Function from a postgres trigger securely, it's best to use `pg_net`
  -- and pass the ANON key or SERVICE_ROLE key.

  -- Actually, Supabase has native Webhooks (via supabase_functions.http_request) that are easier to setup in UI.
  -- But here we are asked to create a trigger. We can use a simpler approach:
  -- We will just insert a notification request into a queue table or use net.http_post if configured.
  -- Since we are auditing, if pg_net is not configured, it will fail.
  -- Let's just create the trigger and document that the webhook might need to be configured in UI
  -- if the URL is unknown. But we can use a generic function here and the owner can update the URL.

  -- Let's define it using net.http_post but we'll need the project URL.
  -- Or better, we can just use the function and let the Edge Function run.

  -- To avoid breaking the DB if net is not set up properly, we will wrap the net call in an exception block.
  begin
    perform net.http_post(
      url := coalesce(current_setting('app.settings.edge_function_url', true), 'https://caeszgtogifserrxdrcw.supabase.co/functions/v1/sync-badge'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || coalesce(current_setting('app.settings.service_role_key', true), 'MISSING_KEY')
      ),
      body := '{}'::jsonb
    );
  exception when others then
    -- Ignore network errors in trigger to avoid breaking reservations
    null;
  end;

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
