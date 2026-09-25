-- Supabase exposes every table in public through its REST API. This app never
-- uses that API: it connects to Postgres directly as the database owner,
-- which bypasses row level security. Turning RLS on with no policies closes
-- the REST door and changes nothing for the app.
alter table campaigns        enable row level security;
alter table campaign_daily   enable row level security;
alter table leads            enable row level security;
alter table replies          enable row level security;
alter table meetings         enable row level security;
alter table deals            enable row level security;
alter table signal_map       enable row level security;
alter table run_log          enable row level security;
alter table sync_state       enable row level security;
alter table webhook_events   enable row level security;
