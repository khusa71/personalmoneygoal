-- profiles: 1:1 with auth.users, stores all AppState fields except goals
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  age int not null default 28,
  annual_income bigint not null default 3000000,
  monthly_expenses bigint not null default 40000,
  existing_emis bigint not null default 0,
  city_tier text not null default 'metro',
  tax_regime text not null default 'new',
  spouse_income bigint not null default 0,
  liquid_savings bigint not null default 0,
  long_term_portfolio bigint not null default 0,
  redeemable_portfolio_percent int not null default 0,
  retirement_age int not null default 55,
  onboarded boolean not null default false,
  -- Family
  parents_at_home boolean not null default false,
  parents_separate_support boolean not null default false,
  parents_monthly_support bigint not null default 0,
  in_laws_dependent boolean not null default false,
  marital_status text not null default 'single',
  marriage_age int,
  number_of_kids int not null default 0,
  kids_ages jsonb not null default '[]',
  planning_more_kids boolean not null default false,
  next_kid_in_years int not null default 0,
  first_kid_age int,
  second_kid_age int,
  -- Health
  parents_health_insurance boolean not null default false,
  parents_health_premium bigint not null default 0,
  -- Finance
  existing_investment_monthly bigint not null default 0,
  lifestyle_monthly bigint not null default 10000,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- goals: 1:many per user
create table public.goals (
  id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  target_year int not null,
  today_cost bigint not null,
  inflation_rate numeric(5,4) not null default 0.06,
  is_recurring boolean not null default false,
  status text not null default 'active',
  priority int not null default 2,
  existing_corpus bigint not null default 0,
  end_year int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (id, user_id)
);

-- RLS: users can only access their own data
alter table public.profiles enable row level security;
alter table public.goals enable row level security;

create policy "Users read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles
  for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users read own goals" on public.goals
  for select using (auth.uid() = user_id);
create policy "Users insert own goals" on public.goals
  for insert with check (auth.uid() = user_id);
create policy "Users update own goals" on public.goals
  for update using (auth.uid() = user_id);
create policy "Users delete own goals" on public.goals
  for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger goals_updated_at before update on public.goals
  for each row execute function public.update_updated_at();
