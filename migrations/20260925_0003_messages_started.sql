-- LinkedIn first messages ("connections messaged" in the weekly doc), which
-- HeyReach reports as totalMessageStarted. Zero for email.
alter table campaign_daily add column if not exists messages_started integer not null default 0;
