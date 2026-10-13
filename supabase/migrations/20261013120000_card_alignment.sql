alter table public.cards
  add column question_align text not null default 'center' check (question_align in ('left', 'center')),
  add column answer_align text not null default 'center' check (answer_align in ('left', 'center'));
