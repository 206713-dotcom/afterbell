-- School affiliation, mutual connections and scoped, persistent conversations.
alter table public.profiles add column school_hub_id uuid references public.hubs(id)on delete set null;
create table public.connections(
 id uuid primary key default gen_random_uuid(),requester_id uuid not null references profiles(id)on delete cascade,
 addressee_id uuid not null references profiles(id)on delete cascade,status text not null default 'pending'check(status in('pending','accepted','declined')),
 created_at timestamptz not null default now(),check(requester_id<>addressee_id)
);
create unique index connections_pair on connections(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create table public.chat_messages(
 id uuid primary key default gen_random_uuid(),hub_id uuid references hubs(id)on delete cascade,
 connection_id uuid references connections(id)on delete cascade,sender_id uuid not null references profiles(id)on delete cascade,
 body text not null,removed boolean not null default false,created_at timestamptz not null default now(),
 check((hub_id is null)<>(connection_id is null)),check((removed and body='')or length(trim(body))between 1 and 1500)
);
create index chat_hub_time on chat_messages(hub_id,created_at desc);
create index chat_connection_time on chat_messages(connection_id,created_at desc);
create index chat_sender_time on chat_messages(sender_id,created_at desc);
alter table connections enable row level security;alter table chat_messages enable row level security;
revoke all on connections,chat_messages from public,anon,authenticated;
grant select on connections,chat_messages to authenticated;

create function public.social_blocked(peer uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$select exists(select 1 from user_blocks where(user_id=auth.uid()and blocked_id=peer)or(blocked_id=auth.uid()and user_id=peer))$$;
create function public.social_shared_hubs(peer uuid)returns uuid[] language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(array_agg(h.id),'{}'::uuid[])from hubs h join hub_members me on me.hub_id=h.id and me.user_id=auth.uid()and me.status='approved' join hub_members them on them.hub_id=h.id and them.user_id=peer and them.status='approved'where h.approved and(is_adult()or(h.visibility='private'and h.youth_approved))
$$;
create function public.social_peer_allowed(peer uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select auth.uid()is not null and peer<>auth.uid()and exists(select 1 from profiles me join profiles p on p.id=peer where me.id=auth.uid()and me.onboarded and p.onboarded and me.age=p.age and not social_blocked(p.id)and(me.age='adult'or cardinality(social_shared_hubs(peer))>0)and(p.discoverable and p.age='adult'or(p.hub_directory_visible and cardinality(social_shared_hubs(peer))>0)or exists(select 1 from connections c where c.status in('pending','accepted')and auth.uid()in(c.requester_id,c.addressee_id)and peer in(c.requester_id,c.addressee_id))))
$$;
create function public.social_connection_visible(connection uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from connections c where c.id=connection and auth.uid()in(c.requester_id,c.addressee_id)and social_peer_allowed(case when c.requester_id=auth.uid()then c.addressee_id else c.requester_id end))
$$;
create function public.social_room_allowed(hub uuid,connection uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select case when hub is not null and connection is null then exists(select 1 from hubs h where h.id=hub and h.approved and is_member(h.id)and(is_adult()or(h.visibility='private'and h.youth_approved)))when hub is null and connection is not null then is_adult()and social_connection_visible(connection)and exists(select 1 from connections c where c.id=connection and c.status='accepted')else false end
$$;
create policy connection_parties on connections for select to authenticated using(social_connection_visible(id));
create policy conversation_members on chat_messages for select to authenticated using(social_room_allowed(hub_id,connection_id)and not social_blocked(sender_id));

create function public.afterbell_social_mutate(operation text,payload jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;community hubs%rowtype;relation connections%rowtype;message chat_messages%rowtype;hub uuid;conversation uuid;text_value text;created uuid;
begin
 if auth.uid()is null or not exists(select 1 from profiles where id=auth.uid()and onboarded)then raise exception 'Complete your account profile first';end if;
 if operation in('selectSchool','connect','connectionRespond','disconnect','chatDelete')then target:=(payload->>'id')::uuid;if target is null then raise exception 'Choose a valid item';end if;end if;
 if operation='selectSchool'then
  select * into community from hubs where id=target and kind in('school','university')and approved and visibility='private'and(is_adult()or youth_approved);
  if community.id is null then raise exception 'Choose an approved school community';end if;
  insert into hub_members(hub_id,user_id,role,status)values(target,auth.uid(),'member','pending')on conflict(hub_id,user_id)do update set status=case when hub_members.status='rejected'then'pending'else hub_members.status end;
  update profiles set school_hub_id=target where id=auth.uid();
 elsif operation='connect'then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  if not social_peer_allowed(target)then raise exception 'This person is not available to connect';end if;
  if exists(select 1 from connections where auth.uid()in(requester_id,addressee_id)and target in(requester_id,addressee_id))then raise exception 'A request or connection already exists';end if;
  if(select count(*)from connections where requester_id=auth.uid()and created_at>now()-interval'1 day')>=50 then raise exception 'Too many friend requests today';end if;
  insert into connections(requester_id,addressee_id)values(auth.uid(),target)returning id into created;
 elsif operation='connectionRespond'then
  select * into relation from connections where id=target for update;
  if relation.addressee_id is distinct from auth.uid()or relation.status<>'pending'or not social_peer_allowed(relation.requester_id)then raise exception 'Only the recipient can answer a pending request';end if;
  if jsonb_typeof(payload->'accept')is distinct from 'boolean'then raise exception 'Choose accept or decline';end if;
  update connections set status=case when(payload->>'accept')::boolean then'accepted'else'declined'end where id=target;
 elsif operation='disconnect'then
  select * into relation from connections where id=target for update;
  if relation.id is null or auth.uid()not in(relation.requester_id,relation.addressee_id)then raise exception 'Connection unavailable';end if;
  update connections set status='declined'where id=target;
 elsif operation='chatSend'then
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
  hub:=nullif(payload->>'hubId','')::uuid;conversation:=nullif(payload->>'connectionId','')::uuid;text_value:=trim(coalesce(payload->>'body',''));
  if not social_room_allowed(hub,conversation)then raise exception 'Approved membership or an accepted adult connection is required';end if;
  if length(text_value)not between 1 and 1500 then raise exception 'Messages must contain 1 to 1500 characters';end if;
  if(select count(*)from chat_messages where sender_id=auth.uid()and created_at>now()-interval'10 seconds')>=6 then raise exception 'Give the conversation a moment before sending more messages';end if;
  insert into chat_messages(hub_id,connection_id,sender_id,body)values(hub,conversation,auth.uid(),text_value)returning id into created;
 elsif operation='chatDelete'then
  select * into message from chat_messages where id=target for update;
  if message.id is null or not social_room_allowed(message.hub_id,message.connection_id)or(message.sender_id<>auth.uid()and(message.hub_id is null or not hub_manager(message.hub_id)))then raise exception 'Only the sender or community moderator can remove this message';end if;
  update chat_messages set body='',removed=true where id=target;
 else raise exception 'Unknown social operation';end if;
 return jsonb_build_object('ok',true,'id',coalesce(created,target));
end$$;

create function public.afterbell_social_state()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;
begin
 if auth.uid()is null then raise exception 'Authentication required';end if;
 select jsonb_build_object(
 'schoolHubId',(select school_hub_id from profiles where id=auth.uid()),
 'schoolDirectory',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'name',h.name,'city',h.city,'kind',h.kind)order by h.name)from hubs h where h.approved and h.visibility='private'and h.kind in('school','university')and(is_adult()or h.youth_approved)),'[]'::jsonb),
 'connections',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'requesterId',c.requester_id,'addresseeId',c.addressee_id,'status',c.status,'createdAt',c.created_at))from connections c where social_connection_visible(c.id)),'[]'::jsonb),
 'connectionPeople',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'city',p.city,'age',p.age,'interests',p.interests,'sharedHubIds',social_shared_hubs(p.id)))from profiles p where social_peer_allowed(p.id)),'[]'::jsonb),
 'messages',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'hubId',q.hub_id,'connectionId',q.connection_id,'senderId',q.sender_id,'senderName',p.display_name,'body',q.body,'removed',q.removed,'createdAt',q.created_at)order by q.created_at,q.id)from(select * from chat_messages m where social_room_allowed(m.hub_id,m.connection_id)and not social_blocked(m.sender_id)order by m.created_at desc,m.id desc limit 500)q join profiles p on p.id=q.sender_id),'[]'::jsonb))into result;
 return result;
end$$;
revoke all on function public.social_blocked(uuid),public.social_shared_hubs(uuid),public.social_peer_allowed(uuid),public.social_connection_visible(uuid),public.social_room_allowed(uuid,uuid),public.afterbell_social_mutate(text,jsonb),public.afterbell_social_state()from public,anon;
grant execute on function public.social_blocked(uuid),public.social_shared_hubs(uuid),public.social_peer_allowed(uuid),public.social_connection_visible(uuid),public.social_room_allowed(uuid,uuid),public.afterbell_social_mutate(text,jsonb),public.afterbell_social_state()to authenticated;

-- Qualify the member parameter where a joined Spark also has a target column.
create or replace function public.afterbell_manage_hub(h uuid,action text,target uuid default null,assigned_role text default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare community hubs%rowtype;member hub_members%rowtype;
begin
 if auth.uid()is null then raise exception 'Authentication required';end if;
 select * into community from hubs where id=h for update;
 if community.id is null then raise exception 'Community unavailable';end if;
 if not hub_manager(h)then raise exception 'Community organizer required';end if;
 select * into member from hub_members where hub_id=h and user_id=target for update;
 if member.user_id is null then raise exception 'Select a community member';end if;
 if action in('approve','reject')then
  if member.status<>'pending'then raise exception 'Only pending requests can be reviewed';end if;
  if action='approve'and not exists(select 1 from profiles where id=target and onboarded and(age='adult'or(community.approved and community.youth_approved and community.visibility='private')))then raise exception 'Approved youth community required';end if;
  update hub_members set status=case when action='approve'then'approved'else'rejected'end where hub_id=h and user_id=target;
 elsif action='role'then
  if not hub_admin(h)then raise exception 'Hub administrator required';end if;
  if member.status<>'approved'or assigned_role is null or assigned_role not in('member','organizer','hub_admin')then raise exception 'Invalid member role';end if;
  if target=community.owner_id and assigned_role<>'hub_admin'then raise exception 'Transfer ownership before demoting the community owner';end if;
  if member.role='hub_admin'and assigned_role<>'hub_admin'and(select count(*)from hub_members where hub_id=h and role='hub_admin'and status='approved')<=1 then raise exception 'Keep at least one hub administrator';end if;
  update hub_members set role=assigned_role::member_role where hub_id=h and user_id=target;
 elsif action='transfer'then
  if auth.uid()<>community.owner_id and not is_admin()then raise exception 'Only the community owner can transfer ownership';end if;
  if member.status<>'approved'or member.role<>'hub_admin'then raise exception 'Choose an approved hub administrator';end if;
  update hubs set owner_id=target,updated_at=now()where id=h;
 elsif action='remove'then
  if not hub_admin(h)then raise exception 'Hub administrator required';end if;
  if target=community.owner_id then raise exception 'Transfer community ownership first';end if;
  if member.role='hub_admin'and(select count(*)from hub_members where hub_id=h and role='hub_admin'and status='approved')<=1 then raise exception 'Keep at least one hub administrator';end if;
  if exists(select 1 from sessions se join sparks sp on sp.id=se.spark_id where sp.hub_id=h and se.status='confirmed'and se.ends_at>now()and(exists(select 1 from session_participants q where q.spark_id=sp.id and q.user_id=afterbell_manage_hub.target and q.state='accepted')or exists(select 1 from resource_reservations r join resource_offers o on o.id=r.offer_id where r.session_id=se.id and o.owner_id=afterbell_manage_hub.target)))then raise exception 'Resolve confirmed commitments before removing this member';end if;
  update hub_members set status='rejected',tutor_approved=false,role='member'where hub_id=h and user_id=target;
  update resource_offers set opted_in=false where hub_id=h and owner_id=target;
 else raise exception 'Unknown community operation';end if;
 insert into audit_logs(actor_id,action,entity_id)values(auth.uid(),'hub_'||action,h::text);
 return jsonb_build_object('ok',true);
end$$;
