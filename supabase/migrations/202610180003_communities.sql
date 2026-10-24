-- Completes school/community administration, structured Sparks and impact metrics.
alter table public.profiles add column hub_directory_visible boolean not null default false;
alter table public.profiles add column preferred_activities text[] not null default '{}';
alter table public.hubs add column kind text not null default 'community' check(kind in ('school','university','club','organization','community'));
update public.hubs set kind='school' where youth_approved;
alter table public.hubs add constraint schools_are_private check(kind not in ('school','university')or visibility='private');
create table public.venues(id text primary key,name text not null,city text not null,address text not null,source_url text not null,checked_at date not null);
insert into public.venues values('sports-arena-sentosa','Sports Arena Sentosa','Kuala Lumpur','Jalan Sri Sentosa 2A, Jalan Klang Lama, 58000 Kuala Lumpur','https://sports-arena.com/item/badminton-court-2/','2026-10-18');
alter table public.venues enable row level security;
revoke all on public.venues from public,anon,authenticated;grant select on public.venues to authenticated;
create policy venue_reference on public.venues for select to authenticated using(true);
alter table public.sparks add column subject text not null default '' check(length(subject)<=60);
alter table public.sparks add column academic_level text not null default 'General learning' check(length(academic_level)<=40);
alter table public.sparks add column learning_goals text not null default '' check(length(learning_goals)<=400);
alter table public.sparks add column game_mode text not null default 'casual' check(game_mode in ('singles','doubles','casual'));
alter table public.sparks add column venue_id text references public.venues(id);
alter table public.sparks add constraint badminton_game_size check(category<>'badminton'or game_mode='casual'or target=case when game_mode='singles'then 2 else 4 end);

create function public.hub_manager(h uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select hub_admin(h)or exists(select 1 from hub_members where hub_id=h and user_id=auth.uid()and status='approved'and role='organizer')
$$;
create function public.afterbell_hub_details(h uuid)returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare managing boolean;result jsonb;
begin
 if auth.uid()is null or not can_access_hub(h)then raise exception 'Community unavailable';end if;
 if not is_member(h)and not hub_admin(h)then return jsonb_build_object('members','[]'::jsonb,'invites','[]'::jsonb,'managing',false);end if;
 managing:=hub_manager(h);
 select jsonb_build_object('managing',managing,'members',coalesce((select jsonb_agg(jsonb_build_object('hubId',m.hub_id,'userId',m.user_id,'name',case when p.hub_directory_visible or managing or p.id=auth.uid()then p.display_name else 'Private member'end,'role',m.role,'status',m.status,'tutorApproved',m.tutor_approved,'directoryVisible',p.hub_directory_visible,'interests',case when p.hub_directory_visible or p.id=auth.uid()then p.interests else '{}'::text[]end,'subjects',case when p.hub_directory_visible or p.id=auth.uid()then p.subjects else '{}'::text[]end)order by m.role,p.display_name)from hub_members m join profiles p on p.id=m.user_id where m.hub_id=h and(m.status='approved'or(managing and m.status='pending'))),'[]'::jsonb),'invites',case when managing then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'hubId',i.hub_id,'expiresAt',i.expires_at,'used',i.used_by is not null)order by i.created_at desc)from hub_invitations i where hub_id=h),'[]'::jsonb)else'[]'::jsonb end)into result;
 return result;
end$$;

create function public.afterbell_manage_hub(h uuid,action text,target uuid default null,assigned_role text default null)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
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
  if exists(select 1 from sessions se join sparks sp on sp.id=se.spark_id where sp.hub_id=h and se.status='confirmed'and se.ends_at>now()and(exists(select 1 from session_participants q where q.spark_id=sp.id and q.user_id=target and q.state='accepted')or exists(select 1 from resource_reservations r join resource_offers o on o.id=r.offer_id where r.session_id=se.id and o.owner_id=target)))then raise exception 'Resolve confirmed commitments before removing this member';end if;
  update hub_members set status='rejected',tutor_approved=false,role='member'where hub_id=h and user_id=target;
  update resource_offers set opted_in=false where hub_id=h and owner_id=target;
 else raise exception 'Unknown community operation';end if;
 insert into audit_logs(actor_id,action,entity_id)values(auth.uid(),'hub_'||action,h::text);
 return jsonb_build_object('ok',true);
end$$;

create function public.afterbell_mutate_v2(operation text,payload jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;entity uuid;activity sparks%rowtype;kind_value text;
begin
 if auth.uid()is null then raise exception 'Authentication required';end if;
 if operation='publishSpark'then
  entity:=(payload->>'id')::uuid;
  select * into activity from sparks where id=entity for update;
  if activity.owner_id is distinct from auth.uid()or activity.status<>'DRAFT'or not can_access_spark(entity)then raise exception 'Only the organizer can publish an accessible draft';end if;
  if activity.hub_id is not null and not exists(select 1 from hubs h where h.id=activity.hub_id and h.approved and is_member(h.id)and(is_adult()or h.youth_approved))then raise exception 'Approved community membership required';end if;
  update sparks set status='BLOCKED',updated_at=now()where id=entity;
  insert into audit_logs(actor_id,action,entity_id)values(auth.uid(),'publishSpark',entity::text);
  return jsonb_build_object('id',entity,'ok',true);
 end if;
 if operation='createHub'then
  kind_value:=coalesce(payload->>'kind','community');
  if kind_value in('school','university')and payload->>'visibility'<>'private'then raise exception 'School communities must be private';end if;
 end if;
 result:=afterbell_mutate(operation,payload);entity:=(result->>'id')::uuid;
 if operation='profile'then
  update profiles set hub_directory_visible=coalesce((payload->>'hubDirectoryVisible')::boolean,false),preferred_activities=coalesce(array(select jsonb_array_elements_text(payload->'preferredActivities')),'{}')where id=auth.uid();
 elsif operation='createHub'then update hubs set kind=kind_value where id=entity;
 elsif operation in('createSpark','updateSpark')then
  if nullif(payload->>'venueId','')is not null and not exists(select 1 from venues where id=payload->>'venueId'and city=payload->>'city')then raise exception 'Choose a venue in the activity city';end if;
  update sparks set subject=coalesce(payload->>'subject',''),academic_level=coalesce(payload->>'academicLevel','General learning'),learning_goals=coalesce(payload->>'learningGoals',''),game_mode=coalesce(payload->>'gameMode','casual'),venue_id=nullif(payload->>'venueId',''),status=case when coalesce((payload->>'draft')::boolean,false)then'DRAFT'::spark_status else'BLOCKED'::spark_status end where id=entity;
 end if;
 return result;
end$$;

-- A facilitator is a person: unique participation and person reservations apply.
alter table public.resource_offers drop constraint one_person_per_offer;
alter table public.resource_offers add constraint one_person_per_offer check(kind not in('participant','tutor','facilitator')or quantity=1);
drop index public.actions_one_person_per_proposal;
create unique index actions_one_person_per_proposal on public.proposal_actions(proposal_id,owner_id)where kind in('participant','tutor','facilitator');
do $$declare f record;definition text;begin
 for f in select oid from pg_proc where pronamespace='public'::regnamespace and proname in('can_offer','offer_busy_windows','proposal_feasible','afterbell_mutate')loop
  definition:=pg_get_functiondef(f.oid);
  definition:=replace(definition,'''participant'',''tutor''','''participant'',''tutor'',''facilitator''');
  definition:=replace(definition,'kind=''tutor''),0)','kind in(''tutor'',''facilitator'')),0)');
  execute definition;
 end loop;
 definition:=pg_get_functiondef('public.create_hub_invite(uuid,text)'::regprocedure);
 execute replace(definition,'not hub_admin(hub)','not hub_manager(hub)');
end$$;

create function public.afterbell_workspace()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare result jsonb;metrics jsonb;
begin
 if auth.uid()is null then raise exception 'Authentication required';end if;
 with visible as(select * from sparks where can_access_spark(id)and status not in('DRAFT','CANCELLED')),
 analyzed as(select p.* from match_proposals p join visible s on s.id=p.spark_id where p.feasible),
 participating as(select distinct q.user_id from session_participants q join visible s on s.id=q.spark_id where q.state='accepted'and s.status in('CONFIRMED','COMPLETED'))
 select jsonb_build_object('registered',(select count(*)from profiles p where p.onboarded and((is_adult()and p.age='adult')or exists(select 1 from hub_members m where m.user_id=p.id and m.status='approved'and can_access_hub(m.hub_id)and is_member(m.hub_id)))),'sparksCreated',(select count(*)from visible),'unlocked',(select count(*)from analyzed),'confirmed',(select count(*)from visible where status='CONFIRMED'),'completed',(select count(*)from visible where status='COMPLETED'),'participatingAdults',(select count(*)from participating q join profiles p on p.id=q.user_id where p.age='adult'),'participatingStudents',(select count(*)from participating q join profiles p on p.id=q.user_id where p.age='youth'),'resolved',(select coalesce(sum(coalesce((analyzed.result->>'resolved')::integer,0)),0)from analyzed),'baseline',(select coalesce(sum(coalesce((analyzed.result->>'baselineResolved')::integer,0)),0)from analyzed))into metrics;
 select jsonb_build_object('participationRequests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'sparkId',r.spark_id,'userId',r.user_id,'status',r.status))from participation_requests r where r.user_id=auth.uid()or owns_spark(r.spark_id)),'[]'::jsonb),'impact',metrics,'hubDirectoryVisible',(select hub_directory_visible from profiles where id=auth.uid()),'preferredActivities',(select preferred_activities from profiles where id=auth.uid()),'memberships',coalesce((select jsonb_agg(jsonb_build_object('hubId',h.id,'name',h.name,'role',m.role,'status',m.status,'kind',h.kind,'visibility',h.visibility))from hub_members m join hubs h on h.id=m.hub_id where m.user_id=auth.uid()),'[]'::jsonb),'hubs',coalesce((select jsonb_agg(jsonb_build_object('id',h.id,'ownerId',h.owner_id,'kind',h.kind,'role',(select role from hub_members where hub_id=h.id and user_id=auth.uid()and status='approved')))from hubs h where can_access_hub(h.id)),'[]'::jsonb),'sparks',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'subject',s.subject,'academicLevel',s.academic_level,'learningGoals',s.learning_goals,'gameMode',s.game_mode,'venueId',s.venue_id))from sparks s where can_access_spark(s.id)),'[]'::jsonb))into result;
 return result;
end$$;
revoke all on function public.hub_manager(uuid),public.afterbell_hub_details(uuid),public.afterbell_manage_hub(uuid,text,uuid,text),public.afterbell_mutate_v2(text,jsonb),public.afterbell_workspace()from public,anon;
grant execute on function public.hub_manager(uuid),public.afterbell_hub_details(uuid),public.afterbell_manage_hub(uuid,text,uuid,text),public.afterbell_mutate_v2(text,jsonb),public.afterbell_workspace()to authenticated;
