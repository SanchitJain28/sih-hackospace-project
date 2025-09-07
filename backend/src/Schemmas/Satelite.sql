create table satellites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  norad_id int unique,         -- NORAD catalog number
  tle_line1 text not null,
  tle_line2 text not null,
  created_at timestamp default now()
);
