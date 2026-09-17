-- chefconnect :: 0009_recipes.sql
-- The prep planner's data: a class has recipes, each with ingredients scaled to a
-- base serving count. A session's prep sheet is computed from these (scaled to
-- the booked headcount) in the app, so nothing per-session is stored here. This
-- is chef-only planning data — not shown publicly. Depends on 0001-0008.

create table recipes (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references classes(id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 120),
  base_servings integer not null default 4 check (base_servings between 1 and 100),
  notes         text check (char_length(notes) <= 2000),
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index recipes_class_idx on recipes (class_id, position);

create trigger trg_recipes_updated_at
  before update on recipes
  for each row execute function set_updated_at();

create table recipe_ingredients (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes(id) on delete cascade,
  name      text not null check (char_length(name) between 1 and 120),
  quantity  numeric(12,3) not null default 0 check (quantity >= 0),
  unit      text check (char_length(unit) <= 30), -- null for countable items ("2 eggs")
  position  integer not null default 0
);

create index recipe_ingredients_recipe_idx on recipe_ingredients (recipe_id, position);

-- SECURITY DEFINER helper so ingredient policies don't hit recipes' own RLS.
create or replace function is_chef_of_recipe(p_recipe_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from recipes r
      join classes c on c.id = r.class_id
      join chef_profiles cp on cp.id = c.chef_profile_id
     where r.id = p_recipe_id and cp.user_id = auth.uid()
  )
$$;

-- ---------- RLS: chef-only, scoped to the recipe's class ----------
alter table recipes enable row level security;
create policy "recipes: chef read"   on recipes for select using (is_chef_of_class(class_id));
create policy "recipes: chef insert" on recipes for insert with check (is_chef_of_class(class_id));
create policy "recipes: chef update" on recipes for update using (is_chef_of_class(class_id)) with check (is_chef_of_class(class_id));
create policy "recipes: chef delete" on recipes for delete using (is_chef_of_class(class_id));

alter table recipe_ingredients enable row level security;
create policy "recipe_ingredients: chef read"   on recipe_ingredients for select using (is_chef_of_recipe(recipe_id));
create policy "recipe_ingredients: chef insert" on recipe_ingredients for insert with check (is_chef_of_recipe(recipe_id));
create policy "recipe_ingredients: chef update" on recipe_ingredients for update using (is_chef_of_recipe(recipe_id)) with check (is_chef_of_recipe(recipe_id));
create policy "recipe_ingredients: chef delete" on recipe_ingredients for delete using (is_chef_of_recipe(recipe_id));

-- ---------- RPC: save_recipe ----------
-- Create or update a recipe and replace its whole ingredient list in one
-- transaction, so an edit can never leave a half-updated ingredient set.
create or replace function save_recipe(
  p_class_id      uuid,
  p_name          text,
  p_base_servings integer,
  p_ingredients   jsonb,             -- [{"name":"Flour","quantity":500,"unit":"g"}, ...]
  p_recipe_id     uuid default null, -- null creates, otherwise updates
  p_notes         text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id  uuid;
  v_ing jsonb;
  v_pos integer := 0;
begin
  if not is_chef_of_class(p_class_id) then
    raise exception 'Only the chef who owns this class can manage its recipes' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(btrim(p_name), '') = '' then
    raise exception 'A recipe needs a name' using errcode = 'check_violation';
  end if;

  if p_recipe_id is null then
    insert into recipes (class_id, name, base_servings, notes)
    values (p_class_id, left(btrim(p_name), 120), greatest(1, least(coalesce(p_base_servings, 4), 100)), p_notes)
    returning id into v_id;
  else
    update recipes
       set name = left(btrim(p_name), 120),
           base_servings = greatest(1, least(coalesce(p_base_servings, 4), 100)),
           notes = p_notes
     where id = p_recipe_id and class_id = p_class_id
    returning id into v_id;
    if v_id is null then
      raise exception 'Recipe not found' using errcode = 'no_data_found';
    end if;
    delete from recipe_ingredients where recipe_id = v_id;
  end if;

  for v_ing in select * from jsonb_array_elements(coalesce(p_ingredients, '[]'::jsonb)) loop
    exit when v_pos >= 60;
    if coalesce(btrim(v_ing ->> 'name'), '') <> '' then
      insert into recipe_ingredients (recipe_id, name, quantity, unit, position)
      values (
        v_id,
        left(btrim(v_ing ->> 'name'), 120),
        greatest(0, coalesce((v_ing ->> 'quantity')::numeric, 0)),
        nullif(left(btrim(coalesce(v_ing ->> 'unit', '')), 30), ''),
        v_pos
      );
      v_pos := v_pos + 1;
    end if;
  end loop;

  return v_id;
end;
$$;

-- ---------- grants ----------
grant select, insert, update, delete on recipes, recipe_ingredients to authenticated;
grant all on recipes, recipe_ingredients to service_role;
grant execute on function is_chef_of_recipe to authenticated;
revoke execute on function save_recipe from public, anon;
grant execute on function save_recipe to authenticated;
