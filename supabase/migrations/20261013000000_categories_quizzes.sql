alter table public.folders rename to categories;
alter table public.decks rename to quizzes;
alter table public.quizzes rename column folder_id to category_id;
alter table public.cards rename column deck_id to quiz_id;

alter index folders_owner_created_idx rename to categories_owner_created_idx;
alter index folders_public_created_idx rename to categories_public_created_idx;
alter index decks_folder_created_idx rename to quizzes_category_created_idx;
alter index decks_owner_created_idx rename to quizzes_owner_created_idx;
alter index decks_public_created_idx rename to quizzes_public_created_idx;
alter index cards_deck_position_idx rename to cards_quiz_position_idx;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce((select auth.jwt() ->> 'email'), '')) = 'y.selimdogan@gmail.com'
$$;

-- Categories: only the admin may make them public.
drop policy "Users create their own folders" on public.categories;
drop policy "Users update their own folders" on public.categories;

create policy "Users create their own categories"
  on public.categories for insert
  with check (
    owner_id = (select auth.uid())
    and (not is_public or public.is_admin())
  );

create policy "Users update their own categories"
  on public.categories for update
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (not is_public or public.is_admin())
  );

-- Quizzes: only the admin may make them public.
drop policy "Users create their own decks in their own folders" on public.quizzes;
drop policy "Users update their own decks" on public.quizzes;

create policy "Users create their own quizzes in their own categories"
  on public.quizzes for insert
  with check (
    owner_id = (select auth.uid())
    and (not is_public or public.is_admin())
    and exists (
      select 1 from public.categories
      where categories.id = category_id and categories.owner_id = (select auth.uid())
    )
  );

create policy "Users update their own quizzes"
  on public.quizzes for update
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (not is_public or public.is_admin())
    and exists (
      select 1 from public.categories
      where categories.id = category_id and categories.owner_id = (select auth.uid())
    )
  );
