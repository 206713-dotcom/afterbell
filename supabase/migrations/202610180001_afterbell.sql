-- AfterBell foundation. Run once in a new Supabase project.
-- No service role is used by the web application. All mutations use auth.uid().
create extension if not exists btree_gist;
revoke create on schema public from public, anon, authenticated;

create type public.age_category as enum ('adult','youth');
create type public.spark_status as enum ('DRAFT','BLOCKED','MATCHING','PROPOSED','AWAITING_CONFIRMATION','CONFIRMED','COMPLETED','CANCELLED');
create type public.activity_category as enum ('badminton','study','tutoring','community');
create type public.requirement_kind as enum ('participant','tutor','racket','room','venue','facilitator','projector');
create type public.member_role as enum ('hub_admin','organizer','member');

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default 'Your neighbour' check(length(display_name) between 2 and 60),
 city text not null default 'Petaling Jaya', age public.age_category not null default 'youth',
 interests text[] not null default '{}', general_availability text[] not null default '{}',
 experience text not null default 'Beginner', subjects text[] not null default '{}', community_types text[] not null default '{}',
 discoverable boolean not null default false, onboarded boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Separate table: users cannot assign their own platform role.
create table public.platform_admins (user_id uuid primary key references public.profiles(id) on delete cascade, created_at timestamptz not null default now());
create table public.hubs (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 4 and 80),
 description text not null check(length(description) between 20 and 1000), city text not null,
 category public.activity_category not null, visibility text not null check(visibility in ('public','private')),
 approved boolean not null default false, youth_approved boolean not null default false,
 owner_id uuid not null references public.profiles(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(not youth_approved or (visibility='private' and approved))
);
create table public.hub_members (
 hub_id uuid not null references public.hubs(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
 role public.member_role not null default 'member', status text not null default 'pending' check(status in ('pending','approved','rejected')),
 tutor_approved boolean not null default false, created_at timestamptz not null default now(), primary key(hub_id,user_id)
);
create table public.hub_invitations (
 id uuid primary key default gen_random_uuid(), hub_id uuid not null references public.hubs(id) on delete cascade,
 code_hash text not null unique, created_by uuid not null references public.profiles(id),
 expires_at timestamptz not null default now()+interval '7 days', used_by uuid references public.profiles(id), created_at timestamptz not null default now()
);
create table public.sparks (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), hub_id uuid references public.hubs(id) on delete cascade,
 title text not null check(length(title) between 8 and 100), description text not null check(length(description) between 20 and 1500),
 category public.activity_category not null, city text not null, target integer not null check(target between 2 and 30),
 budget numeric(10,2) not null default 0 check(budget between 0 and 5000), skill text not null default '' check(length(skill)<=60),
 status public.spark_status not null default 'BLOCKED', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(category<>'tutoring' or hub_id is not null)
);
create table public.spark_requirements (
 id uuid primary key default gen_random_uuid(), spark_id uuid not null references public.sparks(id) on delete cascade,
 kind public.requirement_kind not null, quantity integer not null check(quantity between 1 and 30), skill text, capacity integer check(capacity between 1 and 100)
);
create table public.resource_offers (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id), hub_id uuid references public.hubs(id) on delete cascade,
 label text not null check(length(label) between 3 and 100), kind public.requirement_kind not null, city text not null,
 skills text[] not null default '{}', quantity integer not null default 1 check(quantity between 1 and 30),
 capacity integer not null default 1 check(capacity between 1 and 100), cost numeric(10,2) not null default 0 check(cost>=0),
 opted_in boolean not null default false, approved boolean not null default false, commitments integer not null default 0 check(commitments>=0),
 needs jsonb not null default '[]' check(jsonb_typeof(needs)='array'), created_at timestamptz not null default now(),
 check(kind<>'tutor' or hub_id is not null)
);
create table public.availability_slots (
 id uuid primary key default gen_random_uuid(), spark_id uuid references public.sparks(id) on delete cascade,
 offer_id uuid references public.resource_offers(id) on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz not null, check(ends_at>starts_at),
 check((spark_id is not null)::integer+(offer_id is not null)::integer=1)
);
create table public.match_proposals (
 id uuid primary key default gen_random_uuid(), spark_id uuid not null unique references public.sparks(id) on delete cascade,
 result jsonb not null, feasible boolean not null default false, starts_at timestamptz, ends_at timestamptz,
 created_by uuid not null references public.profiles(id), sent_at timestamptz, created_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create table public.proposal_actions (
 id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.match_proposals(id) on delete cascade,
 offer_id uuid not null references public.resource_offers(id), owner_id uuid not null references public.profiles(id),
 label text not null, kind public.requirement_kind not null, quantity integer not null check(quantity>0), cost numeric(10,2) not null check(cost>=0),
 explanation text not null, state text not null default 'pending' check(state in ('pending','accepted','declined')),
 responded_at timestamptz, unique(proposal_id,offer_id)
);
create table public.participation_requests (
 id uuid primary key default gen_random_uuid(), spark_id uuid not null references public.sparks(id) on delete cascade,
 user_id uuid not null references public.profiles(id), status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(), unique(spark_id,user_id)
);
create table public.sessions (
 id uuid primary key default gen_random_uuid(), spark_id uuid not null unique references public.sparks(id) on delete cascade,
 proposal_id uuid references public.match_proposals(id) on delete set null, starts_at timestamptz, ends_at timestamptz,
 status text not null default 'proposed' check(status in ('proposed','confirmed','completed','cancelled')),
 created_at timestamptz not null default now(), check(ends_at>starts_at)
);
create table public.session_participants (
 spark_id uuid not null references public.sparks(id) on delete cascade, user_id uuid not null references public.profiles(id),
 state text not null default 'accepted' check(state in ('accepted','cancelled')), attended boolean not null default false,
 created_at timestamptz not null default now(), primary key(spark_id,user_id)
);
-- Capacity is conservative: an offer is exclusive for its entire session.
-- Individual people cannot be confirmed into simultaneous activities either.
create table public.resource_reservations (
 id uuid primary key default gen_random_uuid(), offer_id uuid references public.resource_offers(id), person_id uuid references public.profiles(id),
 session_id uuid not null references public.sessions(id) on delete cascade, starts_at timestamptz not null, ends_at timestamptz not null,
 check(ends_at>starts_at), check((offer_id is not null)::integer+(person_id is not null)::integer=1),
 exclude using gist (offer_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (offer_id is not null),
 exclude using gist (person_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (person_id is not null)
);
create table public.reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id), spark_id uuid references public.sparks(id) on delete set null,
 reason text not null check(length(reason) between 10 and 1000), status text not null default 'open' check(status in ('open','resolved')),
 created_at timestamptz not null default now()
);
create table public.user_blocks (user_id uuid not null references public.profiles(id), blocked_id uuid not null references public.profiles(id), created_at timestamptz not null default now(),primary key(user_id,blocked_id),check(user_id<>blocked_id));
create table public.spark_declines (spark_id uuid not null references public.sparks(id)on delete cascade,offer_id uuid not null references public.resource_offers(id),owner_id uuid not null references public.profiles(id),created_at timestamptz not null default now(),primary key(spark_id,offer_id));
create table public.saved_sparks (user_id uuid not null references public.profiles(id), spark_id uuid not null references public.sparks(id) on delete cascade, primary key(user_id,spark_id));
create table public.notifications (id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id), message text not null, read boolean not null default false, created_at timestamptz not null default now());
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references public.profiles(id), action text not null, entity_id text, created_at timestamptz not null default now());

create index sparks_hub_city_status on public.sparks(hub_id,city,status);
create index sparks_owner on public.sparks(owner_id);
create index hub_members_user on public.hub_members(user_id,status);
create index offers_scope on public.resource_offers(hub_id,city,kind) where opted_in and approved;
create index slots_spark on public.availability_slots(spark_id);
create index slots_offer on public.availability_slots(offer_id);
create index actions_owner on public.proposal_actions(owner_id,state);
create index actions_proposal on public.proposal_actions(proposal_id);
create unique index actions_one_person_per_proposal on public.proposal_actions(proposal_id,owner_id) where kind in ('participant','tutor');
create index participants_user on public.session_participants(user_id);
create index reports_open on public.reports(status,created_at);
create index notifications_user on public.notifications(user_id,created_at);
alter table public.notifications add column href text;
alter table public.resource_offers add constraint one_person_per_offer check(kind not in ('participant','tutor')or quantity=1);
create function public.valid_dependencies(value jsonb)returns boolean language sql immutable set search_path=public,pg_temp as $$select case when jsonb_typeof(value)<>'array'then false else jsonb_array_length(value)<=5 and not exists(select 1 from jsonb_array_elements(value)n where jsonb_typeof(n)<>'object'or coalesce(n->>'kind','')not in ('racket','room','venue','projector')or coalesce(n->>'quantity','')!~'^([1-9]|[12][0-9]|30)$'or jsonb_typeof(n->'id')is distinct from 'string'or length(n->>'id')>80)end$$;
alter table public.resource_offers add constraint well_formed_dependencies check(valid_dependencies(needs));
do $$declare t text;begin foreach t in array array['profiles','hubs','sparks','resource_offers']loop execute format('alter table public.%I add constraint broad_city_only check(city=any(array[%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L]))',t,'Petaling Jaya','Kuala Lumpur','George Town','Johor Bahru','Ipoh','Shah Alam','Kota Kinabalu','Kuching','Melaka','Seremban','Kuantan','Alor Setar','Kuala Terengganu','Kota Bharu','Kangar','Putrajaya','Labuan');end loop;end$$;

create function public.is_admin() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from platform_admins where user_id=auth.uid())$$;
create function public.is_adult() returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from profiles where id=auth.uid() and age='adult' and onboarded)$$;
create function public.is_member(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from hub_members where hub_id=h and user_id=auth.uid() and status='approved')$$;
create function public.hub_admin(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from hub_members where hub_id=h and user_id=auth.uid() and role='hub_admin' and status='approved') or is_admin()$$;
create function public.can_access_hub(h uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from hubs where id=h and ((approved and visibility='public' and is_adult()) or (is_member(id) and (is_adult() or youth_approved)) or owner_id=auth.uid() or is_admin()))$$;
create function public.can_access_spark(s uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from sparks where id=s and ((hub_id is null and is_adult()) or (hub_id is not null and can_access_hub(hub_id) and (is_adult() or is_member(hub_id)))) and (status<>'DRAFT' or owner_id=auth.uid()) and not exists(select 1 from user_blocks where (user_id=auth.uid() and blocked_id=sparks.owner_id) or (blocked_id=auth.uid() and user_id=sparks.owner_id)))$$;
create function public.owns_spark(s uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from sparks where id=s and owner_id=auth.uid())$$;
create function public.can_offer(o uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(
  select 1 from resource_offers r join profiles p on p.id=r.owner_id
  where r.id=o and (r.owner_id=auth.uid() or (r.hub_id is not null and hub_admin(r.hub_id)) or (
   r.opted_in and r.approved and p.discoverable and p.onboarded and (
    (r.hub_id is null and p.age='adult' and is_adult()) or (
     r.hub_id is not null and is_member(r.hub_id)
     and exists(select 1 from hub_members m where m.hub_id=r.hub_id and m.user_id=r.owner_id and m.status='approved')
     and exists(select 1 from hubs h where h.id=r.hub_id and h.approved and (p.age='adult' or h.youth_approved))
    )
   )
  )) and not exists(select 1 from user_blocks b where (b.user_id=auth.uid() and b.blocked_id=r.owner_id) or (b.blocked_id=auth.uid() and b.user_id=r.owner_id))
 )
$$;

-- Fail closed: authenticated clients have read access through RLS; writes only via checked RPCs.
do $$declare t text; begin foreach t in array array['profiles','platform_admins','hubs','hub_members','hub_invitations','sparks','spark_requirements','resource_offers','availability_slots','match_proposals','proposal_actions','participation_requests','sessions','session_participants','resource_reservations','reports','user_blocks','spark_declines','saved_sparks','notifications','audit_logs'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon, authenticated',t);execute format('grant select on public.%I to authenticated',t);end loop;end$$;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy admin_self on public.platform_admins for select to authenticated using(user_id=auth.uid());
create policy visible_hubs on public.hubs for select to authenticated using(can_access_hub(id));
create policy membership_visibility on public.hub_members for select to authenticated using(user_id=auth.uid() or hub_admin(hub_id));
create policy invitation_admin on public.hub_invitations for select to authenticated using(hub_admin(hub_id));
create policy visible_sparks on public.sparks for select to authenticated using(can_access_spark(id));
create policy visible_requirements on public.spark_requirements for select to authenticated using(can_access_spark(spark_id));
create policy visible_offers on public.resource_offers for select to authenticated using(can_offer(id));
create policy visible_slots on public.availability_slots for select to authenticated using((spark_id is not null and can_access_spark(spark_id)) or (offer_id is not null and can_offer(offer_id)));
create policy visible_proposals on public.match_proposals for select to authenticated using(can_access_spark(spark_id) and (owns_spark(spark_id) or exists(select 1 from public.proposal_actions a where a.proposal_id=match_proposals.id and a.owner_id=auth.uid())));
-- Avoid policy recursion with proposals: action owner OR trusted owns_spark helper.
create function public.can_view_proposal(p uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from match_proposals where id=p and can_access_spark(spark_id) and (owns_spark(spark_id) or exists(select 1 from proposal_actions where proposal_id=p and owner_id=auth.uid())))$$;
create policy visible_actions on public.proposal_actions for select to authenticated using(can_view_proposal(proposal_id));
create policy visible_requests on public.participation_requests for select to authenticated using(user_id=auth.uid() or owns_spark(spark_id));
create policy visible_sessions on public.sessions for select to authenticated using(can_access_spark(spark_id));
create policy visible_participants on public.session_participants for select to authenticated using(can_access_spark(spark_id));
create policy visible_reservations on public.resource_reservations for select to authenticated using((offer_id is not null and can_offer(offer_id)) or person_id=auth.uid());
create policy reports_reviewer on public.reports for select to authenticated using(reporter_id=auth.uid() or is_admin() or exists(select 1 from sparks s where s.id=spark_id and s.hub_id is not null and hub_admin(s.hub_id)));
create policy own_blocks on public.user_blocks for select to authenticated using(user_id=auth.uid());
create policy visible_declines on public.spark_declines for select to authenticated using(owner_id=auth.uid()or owns_spark(spark_id));
create policy own_saved on public.saved_sparks for select to authenticated using(user_id=auth.uid());
create policy own_notifications on public.notifications for select to authenticated using(user_id=auth.uid());
create policy admin_audit on public.audit_logs for select to authenticated using(is_admin());

create function public.create_profile() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$begin insert into profiles(id)values(new.id);return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.create_profile();
insert into public.profiles(id)select id from auth.users on conflict do nothing;

create function public.offer_busy_windows(offer uuid)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select case when can_offer(offer)then coalesce((select jsonb_agg(jsonb_build_object('start',z.starts_at,'end',z.ends_at))from resource_reservations z join resource_offers r on r.id=offer where z.offer_id=r.id or (r.kind in ('participant','tutor')and z.person_id=r.owner_id)),'[]')else'[]'::jsonb end$$;

create function public.hub_member_count(h uuid)returns bigint language sql stable security definer set search_path=public,pg_temp as $$select case when can_access_hub(h)then(select count(*)from hub_members where hub_id=h and status='approved')else 0 end$$;
-- Only report conflicting SUPPLIED activity windows, never other people's event details.
create function public.spark_busy_windows(activity uuid)returns jsonb language sql stable security definer set search_path=public,pg_temp as $$select case when can_access_spark(activity)then coalesce((select jsonb_agg(jsonb_build_object('start',w.starts_at,'end',w.ends_at))from availability_slots w where w.spark_id=activity and exists(select 1 from resource_reservations z join session_participants p on p.user_id=z.person_id join sessions t on t.id=z.session_id where p.spark_id=activity and p.state='accepted'and t.spark_id<>activity and z.starts_at<w.ends_at and z.ends_at>w.starts_at)),'[]')else'[]'::jsonb end$$;
-- Revalidate computed proposals independently of the API. A direct RPC caller cannot
-- manufacture a feasible flag or allocate the same unit to multiple dependencies.
create function public.proposal_feasible(proposal uuid) returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare p match_proposals%rowtype;s sparks%rowtype;a proposal_actions%rowtype;o resource_offers%rowtype;r record;
begin
 select * into p from match_proposals where id=proposal;select * into s from sparks where id=p.spark_id;
 if p.id is null or not owns_spark(s.id)or not can_access_spark(s.id)or p.starts_at is null or p.ends_at<=p.starts_at then return false;end if;
 if not exists(select 1 from availability_slots where spark_id=s.id and starts_at=p.starts_at and ends_at=p.ends_at)then return false;end if;
 if jsonb_array_length(spark_busy_windows(s.id))>0 and exists(select 1 from jsonb_array_elements(spark_busy_windows(s.id))w where (w->>'start')::timestamptz<p.ends_at and (w->>'end')::timestamptz>p.starts_at)then return false;end if;
 if (select count(*)from session_participants where spark_id=s.id and state='accepted')+(select count(distinct x.owner_id)from proposal_actions x where x.proposal_id=p.id and x.kind in ('participant','tutor')and not exists(select 1 from session_participants q where q.spark_id=s.id and q.user_id=x.owner_id and q.state='accepted'))<>s.target then return false;end if;
 if (select coalesce(sum(cost),0)from proposal_actions where proposal_id=p.id)>s.budget then return false;end if;
 for a in select * from proposal_actions where proposal_id=p.id loop
  select * into o from resource_offers where id=a.offer_id;
  if not can_offer(o.id)or not o.opted_in or not o.approved or o.owner_id<>a.owner_id or o.kind<>a.kind or a.quantity>o.quantity or o.hub_id is distinct from s.hub_id or o.city<>s.city then return false;end if;
  if exists(select 1 from spark_declines where spark_id=s.id and offer_id=o.id)then return false;end if;
  if o.kind='tutor'and not exists(select 1 from hub_members where hub_id=s.hub_id and user_id=o.owner_id and status='approved'and tutor_approved)then return false;end if;
  if not exists(select 1 from availability_slots where offer_id=o.id and starts_at<=p.starts_at and ends_at>=p.ends_at)then return false;end if;
  if exists(select 1 from resource_reservations z where (z.offer_id=o.id or (o.kind in ('participant','tutor')and z.person_id=o.owner_id))and z.starts_at<p.ends_at and z.ends_at>p.starts_at)then return false;end if;
 end loop;
 for r in select kind,quantity,skill,capacity from spark_requirements where spark_id=s.id loop
  if coalesce((select sum(x.quantity)from proposal_actions x join resource_offers z on z.id=x.offer_id where x.proposal_id=p.id and x.kind=r.kind and (r.skill is null or r.skill=any(z.skills))and z.capacity>=coalesce(r.capacity,0)),0)<r.quantity then return false;end if;
 end loop;
 for r in select kind,sum(quantity)as quantity from (
  select kind::text,quantity from spark_requirements where spark_id=s.id and kind not in ('participant','tutor')
  union all select n->>'kind',(n->>'quantity')::integer from proposal_actions x join resource_offers z on z.id=x.offer_id cross join lateral jsonb_array_elements(z.needs)n where x.proposal_id=p.id
 )needed group by kind loop
  if coalesce((select sum(quantity)from proposal_actions where proposal_id=p.id and kind::text=r.kind),0)<r.quantity then return false;end if;
 end loop;
 return true;
end$$;

-- Read model. Invoker rights retain RLS on every table. Private profiles are never joined into a public directory.
create function public.afterbell_state() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
select jsonb_build_object(
 'profile',(select jsonb_build_object('id',p.id,'name',p.display_name,'city',p.city,'age',p.age,'interests',p.interests,'availability',p.general_availability,'experience',p.experience,'subjects',p.subjects,'communityTypes',p.community_types,'onboarded',p.onboarded,'discoverable',p.discoverable)from profiles p where p.id=auth.uid()),
 'hubs',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'name',h.name,'city',h.city,'description',h.description,'visibility',h.visibility,'youthApproved',h.youth_approved,'approved',h.approved,'category',h.category,'members',hub_member_count(h.id),'joined',is_member(h.id),'pending',exists(select 1 from hub_members m where m.hub_id=h.id and m.user_id=auth.uid() and m.status='pending'),'admin',hub_admin(h.id)))from hubs h),'[]'),
 'sparks',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'conflicts',spark_busy_windows(s.id),'title',s.title,'description',s.description,'category',s.category,'city',s.city,'hubId',s.hub_id,'ownerId',s.owner_id,'status',s.status,'target',s.target,'budget',s.budget,'skill',s.skill,'createdAt',s.created_at,'participantIds',coalesce((select jsonb_agg(p.user_id)from session_participants p where p.spark_id=s.id and p.state='accepted'),'[]'),'windows',coalesce((select jsonb_agg(jsonb_build_object('start',a.starts_at,'end',a.ends_at)order by a.starts_at)from availability_slots a where a.spark_id=s.id),'[]'),'requirements',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',r.id,'kind',r.kind,'quantity',r.quantity,'skill',r.skill,'capacity',r.capacity)))from spark_requirements r where r.spark_id=s.id),'[]'))order by s.created_at desc)from sparks s),'[]'),
 'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'ownerId',r.owner_id,'label',r.label,'kind',r.kind,'city',r.city,'hubId',r.hub_id,'age',case when r.hub_id is null then 'adult' else 'youth' end,'approved',r.approved,'optedIn',r.opted_in,'skills',r.skills,'quantity',r.quantity,'capacity',r.capacity,'cost',r.cost,'commitments',r.commitments,'needs',r.needs,'windows',coalesce((select jsonb_agg(jsonb_build_object('start',a.starts_at,'end',a.ends_at))from availability_slots a where a.offer_id=r.id),'[]'),'reservations',offer_busy_windows(r.id)))from resource_offers r),'[]'),
 'proposals',coalesce((select jsonb_agg(p.result||jsonb_build_object('id',p.id,'sparkId',p.spark_id,'feasible',p.feasible,'actions',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'candidateId',a.offer_id,'ownerId',a.owner_id,'label',a.label,'kind',a.kind,'quantity',a.quantity,'cost',a.cost,'explanation',a.explanation,'state',a.state))from proposal_actions a where a.proposal_id=p.id),'[]')))from match_proposals p),'[]'),
 'reports',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'sparkId',r.spark_id,'reason',r.reason,'status',r.status,'createdAt',r.created_at))from reports r),'[]'),
 'blocked',coalesce((select jsonb_agg(blocked_id)from user_blocks where user_id=auth.uid()),'[]'),
 'joined',coalesce((select jsonb_agg(hub_id)from hub_members where user_id=auth.uid() and status='approved'),'[]'),
 'saved',coalesce((select jsonb_agg(spark_id)from saved_sparks where user_id=auth.uid()),'[]'),
 'notifications',coalesce((select jsonb_agg(jsonb_build_object('id',id,'text',message,'read',read,'href',href)order by created_at desc)from notifications where user_id=auth.uid()),'[]'),
 'declines',coalesce((select jsonb_agg(jsonb_build_object('sparkId',spark_id,'candidateId',offer_id))from spark_declines),'[]'),
 'attendance',coalesce((select jsonb_agg(jsonb_build_object('sparkId',spark_id,'userId',user_id))from session_participants where attended),'[]'),
 'platformAdmin',is_admin(),
 'membershipRequests',coalesce((select jsonb_agg(jsonb_build_object('hubId',hub_id,'userId',user_id,'status',status))from hub_members where status='pending' and hub_admin(hub_id)),'[]'),
 'participationRequests',coalesce((select jsonb_agg(jsonb_build_object('id',id,'sparkId',spark_id,'userId',user_id,'status',status))from participation_requests where status='pending' and owns_spark(spark_id)),'[]')
)
$$;

-- This RPC accepts no user-supplied role, owner, acceptance state, or arbitrary SQL.
create function public.afterbell_mutate(operation text, payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 actor uuid:=auth.uid(); entity uuid; h uuid; request_user uuid; item jsonb; part jsonb; s sparks%rowtype; pr match_proposals%rowtype; act proposal_actions%rowtype; offer resource_offers%rowtype; profile profiles%rowtype; sess uuid; created uuid; old_age age_category; code text;
begin
 if actor is null then raise exception 'Authentication required';end if;
 select * into profile from profiles where id=actor;
 if profile.id is null then raise exception 'Profile missing';end if;
 if length(payload::text)>40000 then raise exception 'Payload too large';end if;
 if payload ? 'id' then entity:=(payload->>'id')::uuid;end if;
 if operation='profile' then
  if profile.onboarded and (payload->>'age')::age_category<>profile.age then raise exception 'Contact a moderator to correct your age category';end if;
  update profiles set display_name=trim(payload->>'name'),city=payload->>'city',age=(payload->>'age')::age_category,interests=array(select jsonb_array_elements_text(payload->'interests')),general_availability=array(select jsonb_array_elements_text(payload->'availability')),subjects=array(select jsonb_array_elements_text(payload->'subjects')),community_types=array(select jsonb_array_elements_text(payload->'communityTypes')),experience=payload->>'experience',discoverable=(payload->>'discoverable')::boolean,onboarded=true,updated_at=now() where id=actor;
 elsif operation in ('createSpark','updateSpark') then
  h:=nullif(payload->>'hubId','')::uuid;
  if h is null and not is_adult() then raise exception 'Public activities require an adult account';end if;
  if payload->>'category'='tutoring'and not exists(select 1 from hubs where id=h and visibility='private'and approved)then raise exception 'Peer tutoring requires an approved private hub';end if;
  if h is not null and (not is_member(h) or not exists(select 1 from hubs where id=h and approved and (is_adult() or youth_approved))) then raise exception 'Approved hub membership required';end if;
  if operation='updateSpark' then
   select * into s from sparks where id=entity for update;
   if s.id is null or s.owner_id<>actor or s.status in ('CONFIRMED','COMPLETED') then raise exception 'This activity cannot be edited';end if;
   delete from match_proposals where spark_id=entity;delete from spark_requirements where spark_id=entity;delete from availability_slots where spark_id=entity;
   update sparks set title=trim(payload->>'title'),description=trim(payload->>'description'),category=(payload->>'category')::activity_category,city=payload->>'city',hub_id=h,target=(payload->>'target')::integer,budget=(payload->>'budget')::numeric,skill=payload->>'skill',status='BLOCKED',updated_at=now() where id=entity;
  else
   insert into sparks(owner_id,hub_id,title,description,category,city,target,budget,skill)values(actor,h,trim(payload->>'title'),trim(payload->>'description'),(payload->>'category')::activity_category,payload->>'city',(payload->>'target')::integer,(payload->>'budget')::numeric,payload->>'skill')returning id into entity;
   insert into session_participants(spark_id,user_id)values(entity,actor);
  end if;
  for item in select * from jsonb_array_elements(payload->'requirements')loop insert into spark_requirements(spark_id,kind,quantity,skill,capacity)values(entity,(item->>'kind')::requirement_kind,(item->>'quantity')::integer,item->>'skill',(item->>'capacity')::integer);end loop;
  for item in select * from jsonb_array_elements(payload->'windows')loop insert into availability_slots(spark_id,starts_at,ends_at)values(entity,(item->>'start')::timestamptz,(item->>'end')::timestamptz);end loop;
  if not exists(select 1 from availability_slots where spark_id=entity)then raise exception 'At least one valid time window is required';end if;
 elsif operation='deleteSpark' then
  if not exists(select 1 from sparks where id=entity and owner_id=actor and status not in ('CONFIRMED','COMPLETED'))then raise exception 'Only the organizer can delete an unconfirmed Spark';end if;
  delete from sparks where id=entity;
 elsif operation='createHub' then
  if not is_adult()then raise exception 'An adult organizer must create a hub';end if;
  insert into hubs(name,description,city,category,visibility,owner_id)values(trim(payload->>'name'),trim(payload->>'description'),payload->>'city',(payload->>'category')::activity_category,payload->>'visibility',actor)returning id into entity;
  insert into hub_members(hub_id,user_id,role,status)values(entity,actor,'hub_admin','approved');
 elsif operation='redeem' then
  select hub_id into h from hub_invitations where code_hash=encode(sha256(convert_to(payload->>'code','UTF8')),'hex') and expires_at>now() and used_by is null for update;
  if h is null then raise exception 'Invitation is invalid, expired, or used';end if;
  if not is_adult()and not exists(select 1 from hubs where id=h and youth_approved and approved)then raise exception 'Youth access needs an approved school hub';end if;
  insert into hub_members(hub_id,user_id,status)values(h,actor,'pending')on conflict(hub_id,user_id)do update set status=case when hub_members.status='approved' then 'approved' else 'pending' end;
  update hub_invitations set used_by=actor where code_hash=encode(sha256(convert_to(payload->>'code','UTF8')),'hex');
 elsif operation='join' then
  if exists(select 1 from hubs where id=entity)then
   if not is_adult()or not exists(select 1 from hubs where id=entity and approved and visibility='public')then raise exception 'Private hubs require an invitation';end if;
   insert into hub_members(hub_id,user_id,status)values(entity,actor,'pending')on conflict do nothing;
  else
   if not can_access_spark(entity)then raise exception 'Activity unavailable';end if;
   if exists(select 1 from sparks where id=entity and status in ('CONFIRMED','COMPLETED','CANCELLED'))then raise exception 'Activity is not accepting requests';end if;
   insert into participation_requests(spark_id,user_id)values(entity,actor)on conflict do nothing;
  end if;
 elsif operation='approve' then
  if not hub_admin(entity)then raise exception 'Hub administrator required';end if;
  request_user:=(payload->>'userId')::uuid;
  if request_user is null then raise exception 'Select a membership request';end if;
  if not exists(select 1 from profiles where id=request_user and (age='adult' or exists(select 1 from hubs where id=entity and youth_approved and approved)))then raise exception 'Youth membership needs approved school hub';end if;
  update hub_members set status=case when coalesce((payload->>'accept')::boolean,true)then 'approved'else'rejected'end where hub_id=entity and user_id=request_user and status='pending';
 elsif operation='approveTutor' then
  if not hub_admin(entity)then raise exception 'Hub administrator required';end if;
  request_user:=(payload->>'userId')::uuid;
  update hub_members set tutor_approved=(payload->>'approved')::boolean where hub_id=entity and user_id=request_user and status='approved';
  update resource_offers set approved=(payload->>'approved')::boolean where hub_id=entity and owner_id=request_user and kind='tutor';
 elsif operation='approveHub' then
  if not is_admin()then raise exception 'Platform administrator required';end if;
  if coalesce((payload->>'youthApproved')::boolean,false)and not exists(select 1 from hubs where id=entity and visibility='private')then raise exception 'Youth hubs must be private';end if;
  update hubs set approved=true,youth_approved=coalesce((payload->>'youthApproved')::boolean,false),updated_at=now() where id=entity;
 elsif operation='approveParticipation' then
  select spark_id,user_id into h,request_user from participation_requests where id=entity and status='pending' for update;
  if h is null or not owns_spark(h)then raise exception 'Activity organizer required';end if;
  select * into s from sparks where id=h for update;
  if s.status in ('CONFIRMED','COMPLETED','CANCELLED')then raise exception 'Activity no longer accepts participants';end if;
  if coalesce((payload->>'accept')::boolean,false)then
   if not exists(select 1 from profiles p where p.id=request_user and ((s.hub_id is null and p.age='adult')or(s.hub_id is not null and exists(select 1 from hub_members m join hubs z on z.id=m.hub_id where m.user_id=p.id and m.hub_id=s.hub_id and m.status='approved' and (p.age='adult'or z.youth_approved)))))then raise exception 'Member is no longer eligible';end if;
   if (select count(*)from session_participants where spark_id=h and state='accepted')>=s.target then raise exception 'Activity capacity reached';end if;
   insert into session_participants(spark_id,user_id)values(h,request_user)on conflict do nothing;
   update participation_requests set status='accepted' where id=entity;
   delete from match_proposals where spark_id=h;update sparks set status='BLOCKED' where id=h;
   select skill into code from spark_requirements where spark_id=h and kind='participant'limit 1;
   delete from spark_requirements where spark_id=h and kind='participant';
   if s.target-(select count(*)from session_participants where spark_id=h and state='accepted')-coalesce((select sum(quantity)from spark_requirements where spark_id=h and kind='tutor'),0)>0 then insert into spark_requirements(spark_id,kind,quantity,skill)values(h,'participant',s.target-(select count(*)from session_participants where spark_id=h and state='accepted')-coalesce((select sum(quantity)from spark_requirements where spark_id=h and kind='tutor'),0),code);end if;
  else update participation_requests set status='declined'where id=entity;end if;
 elsif operation='offer' then
  h:=nullif(payload->>'hubId','')::uuid;
  if payload->>'kind'='tutor'and not exists(select 1 from hubs where id=h and visibility='private'and approved)then raise exception 'Peer tutoring requires an approved private hub';end if;
  if not profile.onboarded or (h is null and not is_adult())or(h is not null and (not is_member(h)or not can_access_hub(h)))then raise exception 'Eligible community membership required';end if;
  if jsonb_typeof(payload->'needs')<>'array' or jsonb_array_length(payload->'needs')>5 then raise exception 'Invalid offer dependencies';end if;
  insert into resource_offers(owner_id,hub_id,label,kind,city,skills,quantity,capacity,cost,opted_in,approved,needs)values(actor,h,payload->>'label',(payload->>'kind')::requirement_kind,payload->>'city',array(select jsonb_array_elements_text(payload->'skills')),(payload->>'quantity')::integer,(payload->>'capacity')::integer,(payload->>'cost')::numeric,true,case when payload->>'kind'='tutor' then exists(select 1 from hub_members where hub_id=h and user_id=actor and tutor_approved and status='approved') when h is not null and payload->>'kind'in ('room','venue','facilitator','projector')then hub_admin(h)else true end,payload->'needs')returning id into entity;
  for item in select * from jsonb_array_elements(payload->'windows')loop insert into availability_slots(offer_id,starts_at,ends_at)values(entity,(item->>'start')::timestamptz,(item->>'end')::timestamptz);end loop;
 elsif operation='removeOffer' then
  if not exists(select 1 from resource_offers where id=entity and owner_id=actor)then raise exception 'Offer owner required';end if;
  if exists(select 1 from resource_reservations where offer_id=entity and ends_at>now())then raise exception 'Cancel confirmed reservations before withdrawing this offer';end if;
  update resource_offers set opted_in=false where id=entity;
 elsif operation='approveOffer' then
  select * into offer from resource_offers where id=entity;
  if offer.hub_id is null or not hub_admin(offer.hub_id)or offer.kind='tutor'then raise exception 'Resource approval requires the hub administrator; tutor roles use the tutor approval process';end if;
  update resource_offers set approved=true where id=entity;
 elsif operation='saveProposal' then
  select * into s from sparks where id=entity for update;
  if s.id is null or s.owner_id<>actor or not can_access_spark(entity)or s.status in ('CONFIRMED','COMPLETED','CANCELLED')then raise exception 'Only the organizer can analyze an open Spark';end if;
  item:=payload->'proposal';
  if jsonb_array_length(item->'actions')>40 then raise exception 'Too many actions';end if;
  -- Do not trust feasible flag, ownership, consent, quantities, costs or times from a direct RPC caller.
  -- Candidate existence and availability are validated below; confirmation also rechecks requirements.
  delete from match_proposals where spark_id=entity;
  insert into match_proposals(spark_id,result,feasible,starts_at,ends_at,created_by)values(entity,item,coalesce((item->>'feasible')::boolean,false),(item->'window'->>'start')::timestamptz,(item->'window'->>'end')::timestamptz,actor)returning id into created;
  for part in select * from jsonb_array_elements(item->'actions')loop
   select * into offer from resource_offers where id=(part->>'candidateId')::uuid;
   if not can_offer(offer.id)or not offer.opted_in or not offer.approved or offer.hub_id is distinct from s.hub_id or offer.city<>s.city then raise exception 'Ineligible candidate';end if;
   if (part->>'quantity')::integer>offer.quantity then raise exception 'Offer capacity exceeded';end if;
   if not exists(select 1 from availability_slots where offer_id=offer.id and starts_at<=(item->'window'->>'start')::timestamptz and ends_at>=(item->'window'->>'end')::timestamptz)then raise exception 'Offer unavailable at proposed time';end if;
   insert into proposal_actions(proposal_id,offer_id,owner_id,label,kind,quantity,cost,explanation)values(created,offer.id,offer.owner_id,offer.label,offer.kind,(part->>'quantity')::integer,offer.cost,left(coalesce(part->>'explanation','Compatible offer; approval required.'),2000));
  end loop;
  update match_proposals set feasible=coalesce((item->>'feasible')::boolean,false)and proposal_feasible(created)where id=created;
  update sparks set status=case when (select feasible from match_proposals where id=created)then 'PROPOSED'::spark_status else 'BLOCKED'::spark_status end,updated_at=now()where id=entity;
 elsif operation='send' then
  if not owns_spark(entity)or not can_access_spark(entity)then raise exception 'Activity organizer with current community access required';end if;
  select * into pr from match_proposals where spark_id=entity and feasible for update;
  if pr.id is null or not exists(select 1 from sparks where id=entity and status='PROPOSED')then raise exception 'An open feasible proposal is required';end if;
  update match_proposals set sent_at=now()where id=pr.id;
  insert into sessions(spark_id,proposal_id,starts_at,ends_at)values(entity,pr.id,pr.starts_at,pr.ends_at)on conflict(spark_id)do update set proposal_id=excluded.proposal_id,starts_at=excluded.starts_at,ends_at=excluded.ends_at,status='proposed';
  insert into notifications(user_id,message,href)select distinct owner_id,'An invitation: '||(select title from sparks where id=entity),'/groups/'||entity::text from proposal_actions where proposal_id=pr.id;
  update sparks set status='AWAITING_CONFIRMATION',updated_at=now()where id=entity;
 elsif operation='respond' then
  select * into act from proposal_actions where id=(payload->>'actionId')::uuid for update;
  select * into pr from match_proposals where id=act.proposal_id for update;
  if act.id is null or act.owner_id<>actor or pr.sent_at is null or not can_access_spark(pr.spark_id)or not exists(select 1 from sparks where id=pr.spark_id and status='AWAITING_CONFIRMATION')then raise exception 'Only the invited person or resource owner can respond to an open invitation';end if;
  update proposal_actions set state=case when (payload->>'accept')::boolean then 'accepted' else 'declined' end,responded_at=now()where id=act.id;
  if not (payload->>'accept')::boolean then insert into spark_declines(spark_id,offer_id,owner_id)values(pr.spark_id,act.offer_id,actor)on conflict do nothing;update sparks set status='BLOCKED'where id=pr.spark_id;update match_proposals set feasible=false where id=pr.id;end if;
 elsif operation='confirm' then
  select * into s from sparks where id=entity for update;
  if s.id is null or s.owner_id<>actor or not can_access_spark(entity)or s.status<>'AWAITING_CONFIRMATION' then raise exception 'Activity organizer and pending session required';end if;
  select * into pr from match_proposals where spark_id=entity for update;
  if not pr.feasible or pr.sent_at is null or pr.starts_at is null or exists(select 1 from proposal_actions where proposal_id=pr.id and state<>'accepted')then raise exception 'Every individual approval is required';end if;
  if not proposal_feasible(pr.id)then raise exception 'Requirements or availability changed; run UNLOCK again';end if;
  if not exists(select 1 from availability_slots where spark_id=entity and starts_at=pr.starts_at and ends_at=pr.ends_at)then raise exception 'Proposed time is outside activity availability';end if;
  -- Lock all resources in stable order; exclusion constraints catch concurrent reservations.
  perform 1 from resource_offers where id in(select offer_id from proposal_actions where proposal_id=pr.id)order by id for update;
  for act in select * from proposal_actions where proposal_id=pr.id loop
   select * into offer from resource_offers where id=act.offer_id;
   if not can_offer(offer.id)or not offer.opted_in or not offer.approved or offer.owner_id<>act.owner_id or offer.kind<>act.kind or offer.quantity<act.quantity or offer.hub_id is distinct from s.hub_id or offer.city<>s.city then raise exception 'An offer or permission changed; run UNLOCK again';end if;
   if offer.kind='tutor' and not exists(select 1 from hub_members where hub_id=s.hub_id and user_id=offer.owner_id and status='approved' and tutor_approved)then raise exception 'Peer tutor approval required';end if;
   if not exists(select 1 from availability_slots where offer_id=offer.id and starts_at<=pr.starts_at and ends_at>=pr.ends_at)then raise exception 'Resource unavailable';end if;
   for part in select * from jsonb_array_elements(offer.needs)loop
    if coalesce((select sum(a.quantity)from proposal_actions a where a.proposal_id=pr.id and a.kind=(part->>'kind')::requirement_kind),0)<(part->>'quantity')::integer then raise exception 'Unresolved candidate resource dependency';end if;
   end loop;
  end loop;
  for item in select to_jsonb(r)from spark_requirements r where spark_id=entity and kind not in ('participant','tutor')loop
   if coalesce((select sum(a.quantity)from proposal_actions a join resource_offers o on o.id=a.offer_id where a.proposal_id=pr.id and a.kind=(item->>'kind')::requirement_kind and (item->>'skill' is null or (item->>'skill')=any(o.skills)) and o.capacity>=coalesce((item->>'capacity')::integer,0)),0)<(item->>'quantity')::integer then raise exception 'Missing resource requirement';end if;
  end loop;
  for item in select to_jsonb(r)from spark_requirements r where spark_id=entity and kind='tutor'loop
   if not exists(select 1 from proposal_actions a join resource_offers o on o.id=a.offer_id where a.proposal_id=pr.id and a.kind='tutor' and (item->>'skill' is null or (item->>'skill')=any(o.skills)))then raise exception 'Approved subject tutor required';end if;
  end loop;
  -- Sum shared dependencies and original resource requirements. The same racket cannot
  -- satisfy multiple dependent people or an additional original requirement twice.
  for item in
   select jsonb_build_object('kind',kind,'quantity',sum(quantity))from (
    select kind::text,quantity from spark_requirements where spark_id=entity and kind not in ('participant','tutor')
    union all
    select n->>'kind',(n->>'quantity')::integer from proposal_actions a join resource_offers o on o.id=a.offer_id cross join lateral jsonb_array_elements(o.needs)n where a.proposal_id=pr.id
   )needed group by kind
  loop
   if coalesce((select sum(quantity)from proposal_actions where proposal_id=pr.id and kind::text=item->>'kind'),0)<(item->>'quantity')::integer then raise exception 'Insufficient combined resource capacity';end if;
  end loop;
  for item in select to_jsonb(r)from spark_requirements r where spark_id=entity and kind='participant' and skill is not null loop
   if coalesce((select sum(a.quantity)from proposal_actions a join resource_offers o on o.id=a.offer_id where a.proposal_id=pr.id and a.kind='participant' and (item->>'skill')=any(o.skills)),0)<(item->>'quantity')::integer then raise exception 'Participant skill requirement not met';end if;
  end loop;
  if (select count(*)from session_participants where spark_id=entity and state='accepted')+(select count(distinct a.owner_id)from proposal_actions a where a.proposal_id=pr.id and a.kind in ('participant','tutor')and not exists(select 1 from session_participants p where p.spark_id=entity and p.user_id=a.owner_id and p.state='accepted'))<>s.target then raise exception 'Required participant capacity is not met exactly';end if;
  if (select coalesce(sum(cost),0)from proposal_actions where proposal_id=pr.id)>s.budget then raise exception 'Budget exceeded';end if;
  select id into sess from sessions where spark_id=entity for update;
  if sess is null then raise exception 'Session missing';end if;
  insert into resource_reservations(offer_id,session_id,starts_at,ends_at)select offer_id,sess,pr.starts_at,pr.ends_at from proposal_actions where proposal_id=pr.id;
  insert into session_participants(spark_id,user_id)select entity,owner_id from proposal_actions where proposal_id=pr.id and kind in ('participant','tutor')on conflict(spark_id,user_id)do update set state='accepted';
  insert into resource_reservations(person_id,session_id,starts_at,ends_at)select user_id,sess,pr.starts_at,pr.ends_at from session_participants where spark_id=entity and state='accepted';
  update resource_offers set commitments=commitments+1 where id in(select offer_id from proposal_actions where proposal_id=pr.id);
  update sessions set status='confirmed'where id=sess;update sparks set status='CONFIRMED',updated_at=now()where id=entity;
  delete from availability_slots where spark_id=entity;insert into availability_slots(spark_id,starts_at,ends_at)values(entity,pr.starts_at,pr.ends_at);
 elsif operation='withdraw'then
  select * into s from sparks where id=entity for update;
  if s.status<>'CONFIRMED'or s.owner_id=actor or not exists(select 1 from session_participants where spark_id=entity and user_id=actor and state='accepted')then raise exception 'Only a confirmed participant can withdraw; organizers cancel the session';end if;
  update session_participants set state='cancelled'where spark_id=entity and user_id=actor;
  insert into spark_declines(spark_id,offer_id,owner_id)select entity,a.offer_id,actor from proposal_actions a join match_proposals p on p.id=a.proposal_id where p.spark_id=entity and a.owner_id=actor and a.kind in ('participant','tutor')on conflict do nothing;
  delete from resource_reservations where session_id in(select id from sessions where spark_id=entity);
  update sessions set status='proposed'where spark_id=entity;update sparks set status='BLOCKED',updated_at=now()where id=entity;update match_proposals set feasible=false where spark_id=entity;
  if not exists(select 1 from spark_requirements where spark_id=entity and kind in ('participant','tutor'))then insert into spark_requirements(spark_id,kind,quantity)values(entity,'participant',s.target-(select count(*)from session_participants where spark_id=entity and state='accepted'));end if;
  insert into notifications(user_id,message,href)values(s.owner_id,'A participant withdrew. Your session needs a replacement.','/groups/'||entity::text);
 elsif operation in ('complete','cancel')then
  if not owns_spark(entity)then raise exception 'Activity organizer required';end if;
  if operation='complete'and not exists(select 1 from sparks where id=entity and status='CONFIRMED')then raise exception 'Confirm the activity first';end if;
  update sessions set status=case when operation='complete'then'completed'else'cancelled'end where spark_id=entity;
  update sparks set status=case when operation='complete'then'COMPLETED'::spark_status else'CANCELLED'::spark_status end,updated_at=now()where id=entity;
  if operation='cancel'then delete from resource_reservations where session_id in(select id from sessions where spark_id=entity);end if;
 elsif operation='attendance'then
  if not exists(select 1 from sparks where id=entity and status in ('CONFIRMED','COMPLETED'))then raise exception 'Session must be confirmed';end if;
  update session_participants set attended=true where spark_id=entity and user_id=actor and state='accepted';
  if not found then raise exception 'You are not a participant';end if;
 elsif operation='report'then
  if not can_access_spark(entity)then raise exception 'Activity unavailable';end if;
  insert into reports(reporter_id,spark_id,reason)values(actor,entity,trim(payload->>'reason'));
 elsif operation='resolveReport'then
  if not is_admin()and not exists(select 1 from reports r join sparks t on t.id=r.spark_id where r.id=entity and hub_admin(t.hub_id))then raise exception 'Authorized moderator required';end if;
  update reports set status='resolved'where id=entity;
 elsif operation='block'then
  if entity=actor then raise exception 'Cannot block yourself';end if;
  delete from user_blocks where user_id=actor and blocked_id=entity;
  if not found then insert into user_blocks(user_id,blocked_id)values(actor,entity);end if;
 elsif operation='save'then
  if not can_access_spark(entity)then raise exception 'Activity unavailable';end if;
  delete from saved_sparks where user_id=actor and spark_id=entity;
  if not found then insert into saved_sparks(user_id,spark_id)values(actor,entity);end if;
 elsif operation='readNotifications'then update notifications set read=true where user_id=actor;
 else raise exception 'Unsupported operation';
 end if;
 insert into audit_logs(actor_id,action,entity_id)values(actor,operation,entity::text);
 return jsonb_build_object('id',entity,'ok',true);
end$$;

create function public.create_hub_invite(hub uuid, hashed_code text)returns void language plpgsql security definer set search_path=public,pg_temp as $$begin if auth.uid() is null or not hub_admin(hub)then raise exception 'Hub administrator required';end if;if length(hashed_code)<>64 then raise exception 'Invalid invitation hash';end if;insert into hub_invitations(hub_id,code_hash,created_by)values(hub,hashed_code,auth.uid());insert into audit_logs(actor_id,action,entity_id)values(auth.uid(),'create_invite',hub::text);end$$;

-- Remove PostgreSQL's default PUBLIC execution grant from all application functions.
do $$declare f record;begin for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in ('is_admin','is_adult','is_member','hub_admin','can_access_hub','can_access_spark','owns_spark','can_offer','can_view_proposal','proposal_feasible','offer_busy_windows','spark_busy_windows','hub_member_count','valid_dependencies','afterbell_state','afterbell_mutate','create_hub_invite','create_profile')loop execute format('revoke all on function %s from public, anon',f.signature);if f.signature::text not like 'create_profile(%'then execute format('grant execute on function %s to authenticated',f.signature);end if;end loop;end$$;
