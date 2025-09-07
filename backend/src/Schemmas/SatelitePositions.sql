create table satellite_positions (
  id uuid primary key default gen_random_uuid(),
  satellite_id uuid references satellites(id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  altitude double precision not null,   -- in km
  velocity jsonb,                       -- optional: store vel vector
  timestamp timestamptz not null default now()
);
