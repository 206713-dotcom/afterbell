-- Additive migration: public, explicitly opted-in adult nearby profiles.
-- No device coordinates or addresses are collected or persisted.
create table public.nearby_areas (
 id text primary key, name text not null, city text not null,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180)
);
insert into public.nearby_areas(id,name,city,latitude,longitude) values
('petaling-jaya','Petaling Jaya','Petaling Jaya',3.107,101.607),
('ss2','SS2','Petaling Jaya',3.118,101.622),
('damansara-utama','Damansara Utama','Petaling Jaya',3.135,101.622),
('kuala-lumpur','Kuala Lumpur','Kuala Lumpur',3.139,101.687),
('ttdi','Taman Tun Dr Ismail','Kuala Lumpur',3.146,101.624),
('bangsar','Bangsar','Kuala Lumpur',3.129,101.671),
('cheras','Cheras','Kuala Lumpur',3.104,101.741),
('george-town','George Town','George Town',5.414,100.329),
('johor-bahru','Johor Bahru','Johor Bahru',1.493,103.742),
('ipoh','Ipoh','Ipoh',4.598,101.09),
('shah-alam','Shah Alam','Shah Alam',3.074,101.518),
('kota-kinabalu','Kota Kinabalu','Kota Kinabalu',5.981,116.073),
('kuching','Kuching','Kuching',1.553,110.359),
('melaka','Melaka','Melaka',2.196,102.249),
('seremban','Seremban','Seremban',2.726,101.938),
('kuantan','Kuantan','Kuantan',3.807,103.326),
('alor-setar','Alor Setar','Alor Setar',6.124,100.368),
('kuala-terengganu','Kuala Terengganu','Kuala Terengganu',5.329,103.137),
('kota-bharu','Kota Bharu','Kota Bharu',6.126,102.238),
('kangar','Kangar','Kangar',6.441,100.198),
('putrajaya','Putrajaya','Putrajaya',2.926,101.696),
('labuan','Labuan','Labuan',5.277,115.242);
create table public.nearby_profiles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 area_id text references public.nearby_areas(id), bio text not null default '' check(length(bio)<=180),
 visible boolean not null default false, updated_at timestamptz not null default now(),
 check(not visible or area_id is not null)
);
create index nearby_visible_areas on public.nearby_profiles(area_id) where visible;
alter table public.nearby_areas enable row level security;
alter table public.nearby_profiles enable row level security;
revoke all on public.nearby_areas, public.nearby_profiles from public, anon, authenticated;
grant select on public.nearby_areas, public.nearby_profiles to authenticated;
create policy area_reference_read on public.nearby_areas for select to authenticated using(true);
create policy own_nearby_settings on public.nearby_profiles for select to authenticated using(user_id=auth.uid());

create function public.afterbell_nearby_settings() returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select coalesce((select jsonb_build_object('areaId',area_id,'bio',bio,'visible',visible)from nearby_profiles where user_id=auth.uid()),jsonb_build_object('areaId',null,'bio','','visible',false))
$$;

create function public.afterbell_save_nearby(payload jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if not is_adult() then raise exception 'Nearby people discovery is available to adult accounts';end if;
 if jsonb_typeof(payload->'visible')is distinct from 'boolean' or jsonb_typeof(payload->'bio')is distinct from 'string' or length(payload::text)>1500 then raise exception 'Invalid nearby profile';end if;
 insert into nearby_profiles(user_id,area_id,bio,visible)values(auth.uid(),nullif(payload->>'areaId',''),trim(payload->>'bio'),(payload->>'visible')::boolean)
 on conflict(user_id)do update set area_id=excluded.area_id,bio=excluded.bio,visible=excluded.visible,updated_at=now();
 insert into audit_logs(actor_id,action,entity_id)values(auth.uid(),'nearby_profile',auth.uid()::text);
 return afterbell_nearby_settings();
end$$;

-- A narrow safe projection; the private profiles table keeps its own-row policy.
-- Distance is between broad, public reference points, never people's positions.
create function public.afterbell_nearby(search_area text, radius_km integer default 25, interest_filter text default '') returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare origin nearby_areas%rowtype; result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 if not is_adult() then return '[]'::jsonb;end if;
 if radius_km<1 or radius_km>3000 or radius_km is null or length(interest_filter)>40 then raise exception 'Invalid nearby search';end if;
 select * into origin from nearby_areas where id=search_area;
 if origin.id is null then raise exception 'Unknown search area';end if;
 select coalesce(jsonb_agg(row_data order by km,user_id),'[]'::jsonb)into result from (
  select p.id as user_id, d.km, jsonb_build_object('id',p.id,'name',split_part(trim(p.display_name),' ',1),'areaId',n.area_id,'bio',n.bio,'interests',p.interests,'subjects',p.subjects,'experience',p.experience,'availability',p.general_availability)as row_data
  from nearby_profiles n join profiles p on p.id=n.user_id join nearby_areas a on a.id=n.area_id
  cross join lateral(select 12742*asin(sqrt(least(1.0,greatest(0.0,power(sin(radians(a.latitude-origin.latitude)/2),2)+cos(radians(origin.latitude))*cos(radians(a.latitude))*power(sin(radians(a.longitude-origin.longitude)/2),2)))))as km)d
  where n.visible and p.age='adult'and p.onboarded and p.id<>auth.uid()and d.km<=radius_km
  and (coalesce(interest_filter,'')=''or interest_filter=any(p.interests))
  and not exists(select 1 from user_blocks b where (b.user_id=auth.uid()and b.blocked_id=p.id)or(b.user_id=p.id and b.blocked_id=auth.uid()))
  order by d.km,p.id limit 100
 ) safe_profiles;
 return result;
end$$;
revoke all on function public.afterbell_nearby_settings(),public.afterbell_save_nearby(jsonb),public.afterbell_nearby(text,integer,text) from public,anon;
grant execute on function public.afterbell_nearby_settings(),public.afterbell_save_nearby(jsonb),public.afterbell_nearby(text,integer,text) to authenticated;
