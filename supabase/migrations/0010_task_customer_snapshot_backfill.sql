begin;

update public.tasks as t
set
  customer_name = c.name,
  customer_nickname = c.nickname,
  updated_at = timezone('utc'::text, now())
from public.customers as c
where t.customer_id = c.id
  and t.owner_id = c.owner_id
  and (
    t.customer_name is distinct from c.name
    or t.customer_nickname is distinct from c.nickname
  );

commit;
