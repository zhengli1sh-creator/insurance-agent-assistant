grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.customers to authenticated;
grant select, insert, update, delete on table public.visit_records to authenticated;
grant select, insert, update, delete on table public.activity_events to authenticated;
grant select, insert, update, delete on table public.activity_participants to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, update, delete on table public.query_templates to authenticated;
grant select, insert, update, delete on table public.insight_reports to authenticated;
grant select, insert, update, delete on table public.insight_report_items to authenticated;

alter table public.customers enable row level security;

drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers for select using ((select auth.uid()) = owner_id);
drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own" on public.customers for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own" on public.customers for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "customers_delete_own" on public.customers;
create policy "customers_delete_own" on public.customers for delete using ((select auth.uid()) = owner_id);

