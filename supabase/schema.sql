-- Daily Deutsch: database schema.
-- Run once in the Supabase dashboard → SQL Editor. Safe to re-run.
--
-- Security model: the browser only holds the public (publishable) key, so every
-- table has Row Level Security. Users read/write their own progress; class data is
-- visible to members of that class; joining and leaderboards go through functions.

-- ---------------------------------------------------------------- tables

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  native_lang text not null default 'en',
  created_at timestamptz not null default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  code text not null unique,
  owner_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id uuid not null references public.classes on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

-- Latest FSRS state per word (synced from the browser).
create table if not exists public.card_states (
  user_id uuid not null references auth.users on delete cascade,
  word_id text not null,
  lesson_id text not null,
  card jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, word_id)
);

-- Every answer (flashcards and drills). Source for streaks, leaderboard, weak words.
create table if not exists public.review_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  word_id text not null,
  lesson_id text not null,
  mode text not null,
  ok boolean not null,
  grade smallint,
  created_at timestamptz not null,
  unique (user_id, word_id, created_at)
);
create index if not exists review_events_user_time on public.review_events (user_id, created_at);
create index if not exists review_events_lesson on public.review_events (lesson_id, word_id);

-- ---------------------------------------------------------------- helpers

create or replace function public.is_class_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = cid and user_id = auth.uid());
$$;

create or replace function public.shares_class_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_members a join class_members b on a.class_id = b.class_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- Profile row is created automatically on sign-up from the sign-up metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, display_name, native_lang)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'native_lang', 'en')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- row level security

alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.card_states enable row level security;
alter table public.review_events enable row level security;

drop policy if exists "read own or classmates" on public.profiles;
create policy "read own or classmates" on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_class_with(id));
drop policy if exists "update own" on public.profiles;
create policy "update own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "members read" on public.classes;
create policy "members read" on public.classes for select to authenticated
  using (public.is_class_member(id));
drop policy if exists "owner updates" on public.classes;
create policy "owner updates" on public.classes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "members read" on public.class_members;
create policy "members read" on public.class_members for select to authenticated
  using (public.is_class_member(class_id));
-- leave a class yourself, or the owner removes someone
drop policy if exists "leave or owner removes" on public.class_members;
create policy "leave or owner removes" on public.class_members for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.classes c where c.id = class_id and c.owner_id = auth.uid())
  );

drop policy if exists "own cards" on public.card_states;
create policy "own cards" on public.card_states for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own events read" on public.review_events;
create policy "own events read" on public.review_events for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "own events insert" on public.review_events;
create policy "own events insert" on public.review_events for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------- functions called by the app

-- Create a class; the caller becomes its owner. Returns the class.
create or replace function public.create_class(class_name text)
returns public.classes language plpgsql security definer set search_path = public as $$
declare
  c classes;
  new_code text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  loop
    -- 6 characters, no 0/O/1/I to avoid typos when sharing
    new_code := array_to_string(array(
      select substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1)
      from generate_series(1, 6)), '');
    exit when not exists (select 1 from classes where code = new_code);
  end loop;
  insert into classes (name, code, owner_id) values (trim(class_name), new_code, auth.uid()) returning * into c;
  insert into class_members (class_id, user_id, role) values (c.id, auth.uid(), 'owner');
  return c;
end;
$$;

-- Join a class by its code. Returns the class, or raises 'invalid code'.
create or replace function public.join_class(class_code text)
returns public.classes language plpgsql security definer set search_path = public as $$
declare
  c classes;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from classes where code = upper(trim(class_code));
  if not found then raise exception 'invalid code'; end if;
  insert into class_members (class_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return c;
end;
$$;

-- Leaderboard for one class (caller must be a member). Days are counted in Berlin time.
create or replace function public.class_leaderboard(cid uuid)
returns table (
  user_id uuid,
  display_name text,
  role text,
  week_answers bigint,
  week_correct bigint,
  streak int,
  words_learned bigint
)
language sql stable security definer set search_path = public as $$
  with members as (
    select m.user_id, m.role, p.display_name
    from class_members m join profiles p on p.id = m.user_id
    where m.class_id = cid and public.is_class_member(cid)
  ),
  today as (select (now() at time zone 'Europe/Berlin')::date as d),
  week as (
    select e.user_id, count(*) as answers, count(*) filter (where e.ok) as correct
    from review_events e
    where e.user_id in (select user_id from members)
      and e.created_at >= date_trunc('week', now() at time zone 'Europe/Berlin') at time zone 'Europe/Berlin'
    group by e.user_id
  ),
  days as (
    select distinct e.user_id, (e.created_at at time zone 'Europe/Berlin')::date as d
    from review_events e
    where e.user_id in (select user_id from members) and e.created_at > now() - interval '400 days'
  ),
  runs as (
    select user_id, max(d) as last_day, count(*) as len
    from (select user_id, d, d - (row_number() over (partition by user_id order by d))::int as grp from days) x
    group by user_id, grp
  ),
  streaks as (
    select r.user_id, max(r.len)::int as streak
    from runs r, today t
    where r.last_day >= t.d - 1
    group by r.user_id
  ),
  learned as (
    select c.user_id, count(*) as n
    from card_states c
    where c.user_id in (select user_id from members) and (c.card ->> 'state')::int <> 0
    group by c.user_id
  )
  select m.user_id, m.display_name, m.role,
         coalesce(w.answers, 0), coalesce(w.correct, 0), coalesce(s.streak, 0), coalesce(l.n, 0)
  from members m
  left join week w on w.user_id = m.user_id
  left join streaks s on s.user_id = m.user_id
  left join learned l on l.user_id = m.user_id
  order by coalesce(w.answers, 0) desc, coalesce(s.streak, 0) desc;
$$;

revoke execute on function public.create_class(text), public.join_class(text), public.class_leaderboard(uuid)
  from public, anon;
grant execute on function public.create_class(text), public.join_class(text), public.class_leaderboard(uuid)
  to authenticated;

-- ================================================================ v2: lessons created in the web editor
-- Published lessons are readable by everyone (also without login); only editors write them.
-- Make yourself an editor once, in the SQL Editor:
--   update public.profiles set is_editor = true
--   where id = (select id from auth.users where email = 'you@example.com');

alter table public.profiles add column if not exists is_editor boolean not null default false;

-- Users may edit their name and language, never their own editor flag.
revoke update on public.profiles from authenticated, anon;
grant update (display_name, native_lang) on public.profiles to authenticated;

create or replace function public.is_editor()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_editor from profiles where id = auth.uid()), false);
$$;

create table if not exists public.lessons (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  title text not null check (char_length(title) between 1 and 80),
  level text,
  lesson_date date not null default current_date,
  content jsonb not null default '{"words": [], "grammar": []}',
  langs text[] not null default '{}',
  words_count int not null default 0,
  grammar_count int not null default 0,
  published boolean not null default false,
  created_by uuid references auth.users on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lessons enable row level security;

drop policy if exists "read published, editors read all" on public.lessons;
create policy "read published, editors read all" on public.lessons for select to anon, authenticated
  using (published or public.is_editor());
drop policy if exists "editors insert" on public.lessons;
create policy "editors insert" on public.lessons for insert to authenticated with check (public.is_editor());
drop policy if exists "editors update" on public.lessons;
create policy "editors update" on public.lessons for update to authenticated
  using (public.is_editor()) with check (public.is_editor());
drop policy if exists "editors delete" on public.lessons;
create policy "editors delete" on public.lessons for delete to authenticated using (public.is_editor());

grant select on public.lessons to anon, authenticated;
grant insert, update, delete on public.lessons to authenticated;
