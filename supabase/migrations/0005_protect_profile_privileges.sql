-- Prevent customer-controlled profile updates from changing privilege or suspension fields.
create or replace function public.protect_profile_privileges()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    new.role := old.role;
    new.account_status := old.account_status;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_privileges_trigger on public.profiles;
create trigger protect_profile_privileges_trigger
before update on public.profiles
for each row execute function public.protect_profile_privileges();
