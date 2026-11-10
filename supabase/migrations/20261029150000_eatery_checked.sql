-- When an officer last confirmed each eatery's details (open, hours, address) against an
-- official source, so the dashboard can flag ones that haven't been looked at in a while.
-- The built-in list was checked in October 2026.

alter table public.eateries add column checked_on date;
update public.eateries set checked_on = date '2026-10-01' where checked_on is null;
