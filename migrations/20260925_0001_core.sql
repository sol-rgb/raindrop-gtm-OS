-- The GTM OS runs on these tables. Everything a page shows is read from here,
-- and everything here is written by the hourly sync, the reply webhooks or
-- the Clay HTTP column. Nothing writes back to Instantly, HeyReach, Clay or
-- HubSpot.
--
-- Migrations are named by date, not by a counter, the same as Raindrop OS.

-- One row per campaign per tool. The signal is not stored here: it is
-- derived from the name (lib/data/signals.js) unless signal_map overrides it,
-- so renaming a campaign in Instantly re-files it on the next sync.
create table if not exists campaigns (
    source        text        not null,           -- instantly | heyreach
    id            text        not null,
    name          text        not null,
    status        text,
    channel       text        not null,           -- email | linkedin
    sender        text,
    open_tracking boolean,
    updated_at    timestamptz not null default now(),
    primary key (source, id)
);

-- One row per campaign per UTC day. Re-pulled over a trailing window every
-- hour, so late-arriving replies land on the day they belong to.
create table if not exists campaign_daily (
    source                text    not null,
    campaign_id           text    not null,
    day                   date    not null,
    contacted             integer not null default 0,
    sent                  integer not null default 0,
    opened                integer not null default 0,
    replied               integer not null default 0,
    opportunities         integer not null default 0,
    connections_sent      integer not null default 0,
    connections_accepted  integer not null default 0,
    primary key (source, campaign_id, day)
);

-- Leads Clay qualified, one per row of a signal's final table. Written by the
-- HTTP column on each table, which is the only way rows leave Clay.
create table if not exists leads (
    id          text        primary key,           -- Clay row id, or domain:signal
    signal      text        not null,
    company     text,
    domain      text,
    person      text,
    email       text,
    linkedin    text,
    entered_at  timestamptz not null default now(),
    payload     jsonb       not null default '{}'
);
create index if not exists leads_signal_idx on leads (signal, entered_at desc);

-- One conversation with one lead. Rebuilt from the Unibox and the HeyReach
-- inbox each hour, and nudged in between by the reply webhooks.
create table if not exists replies (
    source        text        not null,
    thread_id     text        not null,
    channel       text        not null,
    campaign_id   text,
    sender        text,
    lead_name     text,
    lead_company  text,
    lead_email    text,
    status        text,
    positive      boolean     not null default false,
    received_at   timestamptz not null,
    answered_at   timestamptz,
    last_from     text        not null,            -- them | us
    last_at       timestamptz not null,
    snippet       text,
    url           text,
    owner         text,
    done          boolean     not null default false,
    updated_at    timestamptz not null default now(),
    primary key (source, thread_id)
);
create index if not exists replies_waiting_idx on replies (last_from, last_at desc);

create table if not exists meetings (
    id          text        primary key,
    contact_id  text,
    company     text,
    signal      text,
    title       text,
    booked_at   timestamptz,
    start_at    timestamptz,
    outcome     text
);

create table if not exists deals (
    id          text        primary key,
    company     text,
    signal      text,
    stage       text,
    amount      numeric,
    created_at  timestamptz,
    qualified   boolean     not null default false
);

-- Explicit campaign-to-signal filing, for the names no pattern can read.
create table if not exists signal_map (
    source      text not null,
    campaign_id text not null,
    signal      text not null,
    primary key (source, campaign_id)
);

-- Did the tick run, and what did it find. A run that failed and a run that
-- never started look identical from outside; this tells them apart.
create table if not exists run_log (
    id           bigserial   primary key,
    trigger      text        not null default 'cron',
    started_at   timestamptz not null default now(),
    finished_at  timestamptz,
    ok           boolean,
    detail       jsonb       not null default '{}'
);

-- When each source last actually answered, and what it said when it did not.
create table if not exists sync_state (
    source         text        primary key,
    last_ok_at     timestamptz,
    last_error     text,
    last_error_at  timestamptz,
    counts         jsonb       not null default '{}'
);

-- Every inbound webhook, once. The dedupe key is built from the event
-- itself, so a retry from Instantly or HeyReach cannot land twice.
create table if not exists webhook_events (
    id           bigserial   primary key,
    source       text        not null,
    event_type   text        not null,
    dedupe_key   text        not null unique,
    payload      jsonb       not null default '{}',
    received_at  timestamptz not null default now()
);
