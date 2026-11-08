begin;

-- ==========================================
-- CONVERSACIONES DE WHATSAPP
-- ==========================================

create table if not exists public.whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),

  wa_id text not null,
  phone_number_id text not null,
  display_name text,

  opportunity_id uuid
    references public.opportunities(id)
    on delete set null,

  agent_mode text not null default 'autonomous'
    check (agent_mode in ('autonomous', 'paused', 'human')),

  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint whatsapp_conversations_identity_unique
    unique (phone_number_id, wa_id)
);

create index if not exists idx_whatsapp_conversations_recent
on public.whatsapp_conversations (last_message_at desc);

create index if not exists idx_whatsapp_conversations_opportunity
on public.whatsapp_conversations (opportunity_id);


-- ==========================================
-- MENSAJES
-- ==========================================

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),

  conversation_id uuid not null
    references public.whatsapp_conversations(id)
    on delete cascade,

  provider_message_id text,

  direction text not null
    check (direction in ('inbound', 'outbound')),

  message_type text not null default 'text'
    check (message_type in (
      'text', 'audio', 'image', 'video',
      'document', 'location', 'unknown'
    )),

  content text,
  transcription text,
  media_id text,

  status text not null default 'received'
    check (status in (
      'received', 'processing', 'processed',
      'failed', 'sent', 'delivered', 'read'
    )),

  error_message text,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

create unique index if not exists idx_whatsapp_messages_provider_id
on public.whatsapp_messages (provider_message_id)
where provider_message_id is not null;

create index if not exists idx_whatsapp_messages_timeline
on public.whatsapp_messages (conversation_id, created_at);


-- ==========================================
-- SEGURIDAD
-- ==========================================

alter table public.whatsapp_conversations
enable row level security;

alter table public.whatsapp_messages
enable row level security;

drop policy if exists "admin read whatsapp conversations"
on public.whatsapp_conversations;

create policy "admin read whatsapp conversations"
on public.whatsapp_conversations
for select to authenticated
using (public.is_admin());

drop policy if exists "admin update whatsapp agent mode"
on public.whatsapp_conversations;

create policy "admin update whatsapp agent mode"
on public.whatsapp_conversations
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin read whatsapp messages"
on public.whatsapp_messages;

create policy "admin read whatsapp messages"
on public.whatsapp_messages
for select to authenticated
using (
  exists (
    select 1
    from public.whatsapp_conversations c
    where c.id = conversation_id
      and public.is_admin()
  )
);

revoke all on public.whatsapp_conversations
from anon, authenticated, public;

revoke all on public.whatsapp_messages
from anon, authenticated, public;

grant select on public.whatsapp_conversations
to authenticated;

grant update (agent_mode) on public.whatsapp_conversations
to authenticated;

grant select on public.whatsapp_messages
to authenticated;

grant all on public.whatsapp_conversations
to service_role;

grant all on public.whatsapp_messages
to service_role;

commit;