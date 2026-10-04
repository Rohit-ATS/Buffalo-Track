-- Logs every click on a button/link that navigates to /dashboard, so
-- click-through activity is visible over time. Write-only from the browser:
-- anon can insert its own event but can never read, update, or delete any
-- row (including its own) -- the data only has value in aggregate, and this
-- avoids exposing one visitor's activity to another.
create table if not exists atlas_dashboard_clicks (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,  -- which button/link, e.g. 'landing_cta', 'nav_devon', 'family_space_tab'
  from_path  text not null,  -- the page the click happened on
  search     text,           -- the target's ?search params, if any (e.g. "section=family")
  created_at timestamptz not null default now()
);

create index if not exists atlas_dashboard_clicks_source_idx on atlas_dashboard_clicks (source);
create index if not exists atlas_dashboard_clicks_created_at_idx on atlas_dashboard_clicks (created_at);

alter table atlas_dashboard_clicks enable row level security;

drop policy if exists atlas_dashboard_clicks_insert on atlas_dashboard_clicks;
create policy atlas_dashboard_clicks_insert on atlas_dashboard_clicks
  for insert to anon, authenticated with check (true);

-- No select policy: write-only for clients. Read it with the service-role
-- key (bypasses RLS) or from the dashboard's SQL Editor.
