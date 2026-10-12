create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid not null references public.folders (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  question text not null check (char_length(question) between 1 and 4000),
  answer text not null check (char_length(answer) between 1 and 4000),
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now()
);

create index folders_owner_created_idx on public.folders (owner_id, created_at desc);
create index folders_public_created_idx on public.folders (is_public, created_at desc);
create index decks_folder_created_idx on public.decks (folder_id, created_at desc);
create index decks_owner_created_idx on public.decks (owner_id, created_at desc);
create index decks_public_created_idx on public.decks (is_public, created_at desc);
create index cards_deck_position_idx on public.cards (deck_id, position, created_at);

alter table public.folders enable row level security;
alter table public.decks enable row level security;
alter table public.cards enable row level security;

create policy "Folders are visible to their owner or everyone when public"
  on public.folders for select
  using (owner_id = (select auth.uid()) or is_public);

create policy "Users create their own folders"
  on public.folders for insert
  with check (owner_id = (select auth.uid()));

create policy "Users update their own folders"
  on public.folders for update
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Users delete their own folders"
  on public.folders for delete
  using (owner_id = (select auth.uid()));

create policy "Decks are visible to their owner or everyone when public"
  on public.decks for select
  using (owner_id = (select auth.uid()) or is_public);

create policy "Users create their own decks in their own folders"
  on public.decks for insert
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.folders
      where folders.id = folder_id and folders.owner_id = (select auth.uid())
    )
  );

create policy "Users update their own decks"
  on public.decks for update
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.folders
      where folders.id = folder_id and folders.owner_id = (select auth.uid())
    )
  );

create policy "Users delete their own decks"
  on public.decks for delete
  using (owner_id = (select auth.uid()));

create policy "Cards are visible to their owner or when their deck is public"
  on public.cards for select
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.decks
      where decks.id = deck_id and decks.is_public
    )
  );

create policy "Users create cards in their own decks"
  on public.cards for insert
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.decks
      where decks.id = deck_id and decks.owner_id = (select auth.uid())
    )
  );

create policy "Users update their own cards"
  on public.cards for update
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (
      select 1 from public.decks
      where decks.id = deck_id and decks.owner_id = (select auth.uid())
    )
  );

create policy "Users delete their own cards"
  on public.cards for delete
  using (owner_id = (select auth.uid()));
