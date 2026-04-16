-- Design Ref: §2.1 — artists 테이블 생성 + RLS
-- Last.fm 캐시 테이블: slug 기준 7일 TTL

create table if not exists artists (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  image_url  text,
  bio_en     text,
  listeners  integer,
  not_found  boolean default false,
  cached_at  timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists artists_slug_idx on artists (slug);

alter table artists enable row level security;

-- 누구나 읽기 허용 (공개 메타데이터)
create policy "artists_read_public" on artists
  for select using (true);

-- 쓰기는 service_role만 (RLS bypass) — insert/update 명시적 거부
create policy "artists_write_deny" on artists
  for insert with check (false);

create policy "artists_update_deny" on artists
  for update using (false);
