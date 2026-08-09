-- Adding p_variant_id to adjust_inventory() created a second overload instead
-- of replacing the function (CREATE OR REPLACE only replaces on an exact
-- signature match). Drop the old 5-argument version so callers can never
-- hit an ambiguous "which overload?" error.
drop function if exists public.adjust_inventory(uuid, text, text, integer, integer);
