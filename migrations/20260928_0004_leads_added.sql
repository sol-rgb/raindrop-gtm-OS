-- Leads loaded into a campaign, counted per campaign per UTC day. This is the
-- top of the funnel: every lead ends up in Instantly or HeyReach however the
-- list was built (Clay, a scored CSV, a news scan), so counting here catches
-- all of them. signal is filled only when the uploaded lead carried its own
-- "signal" column (Instantly keeps upload columns per lead); otherwise the
-- campaign's signal applies.
create table if not exists leads_added (
    source       text    not null,
    campaign_id  text    not null,
    day          date    not null,
    signal       text    not null default '',
    added        integer not null default 0,
    primary key (source, campaign_id, day, signal)
);
alter table leads_added enable row level security;

-- How many leads each campaign holds right now, as each tool reports it.
alter table campaigns add column if not exists leads_total integer;
