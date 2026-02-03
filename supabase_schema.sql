
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TRADES
create table trades (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  transaction_id text,
  pair text not null,
  side text,
  margin_type text,
  leverage numeric,
  entry_price numeric,
  exit_price numeric,
  quantity numeric,
  amount_symbol text,
  open_fee numeric,
  close_fee numeric,
  funding_fee numeric,
  status text,
  open_time timestamp with time zone,
  close_time timestamp with time zone,
  copiers numeric,
  sharing numeric,
  month_key text, -- YYYY-MM derived field for partitioning/filtering
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FUNDING RECORDS
create table funding_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date timestamp with time zone,
  asset text,
  amount numeric,
  type text,
  month_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SETTINGS
create table settings (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null unique,
  portfolio_size numeric default 10000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES
alter table profiles enable row level security;
alter table trades enable row level security;
alter table funding_records enable row level security;
alter table settings enable row level security;

-- Profiles: Allow users to view/edit their own profile
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Trades: strict ownership
create policy "Users can view own trades" on trades for select using (auth.uid() = user_id);
create policy "Users can insert own trades" on trades for insert with check (auth.uid() = user_id);
create policy "Users can update own trades" on trades for update using (auth.uid() = user_id);
create policy "Users can delete own trades" on trades for delete using (auth.uid() = user_id);

-- Funding: strict ownership
create policy "Users can view own funding" on funding_records for select using (auth.uid() = user_id);
create policy "Users can insert own funding" on funding_records for insert with check (auth.uid() = user_id);
create policy "Users can update own funding" on funding_records for update using (auth.uid() = user_id);
create policy "Users can delete own funding" on funding_records for delete using (auth.uid() = user_id);

-- Settings: strict ownership
create policy "Users can view own settings" on settings for select using (auth.uid() = user_id);
create policy "Users can insert own settings" on settings for insert with check (auth.uid() = user_id);
create policy "Users can update own settings" on settings for update using (auth.uid() = user_id);

-- TRIGGER: Create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  
  insert into public.settings (user_id, portfolio_size)
  values (new.id, 10000);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
