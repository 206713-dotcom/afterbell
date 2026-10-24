-- Researched place references and organizer-recorded booking details.
do $$declare t text;begin
 foreach t in array array['profiles','hubs','sparks','resource_offers']loop
  execute format('alter table public.%I drop constraint broad_city_only',t);
  execute format('alter table public.%I add constraint broad_city_only check(city=any(array[''Petaling Jaya'',''Kuala Lumpur'',''George Town'',''Johor Bahru'',''Ipoh'',''Shah Alam'',''Kota Kinabalu'',''Kuching'',''Melaka'',''Seremban'',''Kuantan'',''Alor Setar'',''Kuala Terengganu'',''Kota Bharu'',''Kangar'',''Putrajaya'',''Labuan'',''Subang Jaya'',''Klang'',''Puchong'',''Cheras'',''Seri Kembangan'',''Rawang'',''Ampang'',''Cyberjaya'',''Kajang'',''Semenyih'',''Sungai Buloh'',''Banting'',''Batang Kali'',''Tanjong Malim'',''Bandar Baru Bangi'',''Tanjong Karang'']))',t);
 end loop;
end$$;
alter table public.venues add column kind text not null default 'badminton' check(kind in('badminton','study'));
alter table public.venues add column booking_url text not null default '';
alter table public.venues add column provider text not null default 'Venue';
alter table public.sparks add column space_label text not null default '' check(length(space_label)<=50);
alter table public.sparks add column booking_status text not null default 'planned' check(booking_status in('planned','booked'));
create table public.venue_booking_references(
  spark_id uuid primary key references public.sparks(id)on delete cascade,
  owner_id uuid not null references public.profiles(id)on delete cascade,
  reference text not null check(length(reference)between 1 and 100)
);
alter table public.venue_booking_references enable row level security;
revoke all on public.venue_booking_references from public,anon,authenticated;
grant select on public.venue_booking_references to authenticated;
create policy own_booking_reference on public.venue_booking_references for select to authenticated using(owner_id=auth.uid());

insert into public.venues(id,name,city,address,source_url,checked_at,kind,booking_url,provider)
select x->>'id',x->>'name',x->>'city',coalesce(nullif(x->>'address',''),x->>'area'),x->>'source','2026-10-22'::date,x->>'kind',x->>'bookingUrl',x->>'provider'
from jsonb_array_elements($places$[
  {
    "id": "sports-arena-sentosa",
    "name": "Sports Arena Sentosa",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Old Klang Road",
    "address": "Jalan Sri Sentosa 2A, Jalan Klang Lama, 58000 Kuala Lumpur",
    "source": "https://sports-arena.com/item/badminton-court-2/",
    "bookingUrl": "https://sports-arena.com/contact-us/",
    "provider": "Venue",
    "description": "Contact the operator to arrange your court and time."
  },
  {
    "id": "tm-elite-badminton-centre-hulu-bernam",
    "name": "TM ELITE BADMINTON CENTRE (HULU BERNAM)",
    "kind": "badminton",
    "city": "Tanjong Malim",
    "area": "Tanjong Malim",
    "address": "",
    "source": "https://playsportstogether.com/complex/tm-elite-badminton-centre-hulu-bernam",
    "bookingUrl": "https://book.afa-sports.com/?auth=554",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "racquet-paddle-club",
    "name": "Racquet & Paddle Club",
    "kind": "badminton",
    "city": "Kajang",
    "area": "Kajang",
    "address": "",
    "source": "https://playsportstogether.com/complex/racquet-paddle-club",
    "bookingUrl": "https://book.afa-sports.com/?auth=549",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "pudu-sports-centre",
    "name": "PUDU SPORTS CENTRE",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/pudu-sports-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=539",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "bk-smash-badminton-and-pickleball-centre",
    "name": "BK SMASH BADMINTON AND PICKLEBALL CENTRE",
    "kind": "badminton",
    "city": "Batang Kali",
    "area": "Batang Kali",
    "address": "",
    "source": "https://playsportstogether.com/complex/bk-smash-badminton-and-pickleball-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=532",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "sjk-c-puay-chai-1",
    "name": "SS2 SJK (C) Puay Chai 1",
    "kind": "badminton",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "",
    "source": "https://playsportstogether.com/complex/sjk-c-puay-chai-1",
    "bookingUrl": "https://book.afa-sports.com/?auth=528",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "go-badminton",
    "name": "Go Badminton",
    "kind": "badminton",
    "city": "Seri Kembangan",
    "area": "Seri Kembangan",
    "address": "",
    "source": "https://playsportstogether.com/complex/go-badminton",
    "bookingUrl": "https://book.afa-sports.com/?auth=497",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "rwg-smash-venture",
    "name": "RWG SMASH VENTURE",
    "kind": "badminton",
    "city": "Rawang",
    "area": "Rawang",
    "address": "",
    "source": "https://playsportstogether.com/complex/rwg-smash-venture",
    "bookingUrl": "https://book.afa-sports.com/?auth=496",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "tmke-sports-arena",
    "name": "TMKE SPORTS ARENA",
    "kind": "badminton",
    "city": "Klang",
    "area": "Klang",
    "address": "",
    "source": "https://playsportstogether.com/complex/tmke-sports-arena",
    "bookingUrl": "https://book.afa-sports.com/?auth=478",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "the-hood",
    "name": "THE HOOD",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/the-hood",
    "bookingUrl": "https://book.afa-sports.com/?auth=471",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "spbc-training-centre",
    "name": "SPBC Training Centre",
    "kind": "badminton",
    "city": "Shah Alam",
    "area": "Shah Alam",
    "address": "",
    "source": "https://playsportstogether.com/complex/spbc-training-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=444",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "nuova-sport-arena",
    "name": "NUOVA Sport Arena",
    "kind": "badminton",
    "city": "Shah Alam",
    "area": "Shah Alam",
    "address": "Jalan Sungai Rasau, Kawasan Perindustrian Sungai Rasau, Shah Alam",
    "source": "https://playsportstogether.com/complex/nuova-sport-arena",
    "bookingUrl": "https://book.afa-sports.com/?auth=407",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "sportheroes",
    "name": "SPORTHEROES",
    "kind": "badminton",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "",
    "source": "https://playsportstogether.com/complex/sportheroes",
    "bookingUrl": "https://book.afa-sports.com/?auth=388",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "kas-kepong-arena-sports",
    "name": "KAS Kepong Arena Sports",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/kas-kepong-arena-sports",
    "bookingUrl": "https://book.afa-sports.com/?auth=324",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "dewan-sri-qamaria",
    "name": "Dewan Sri Qamaria",
    "kind": "badminton",
    "city": "Klang",
    "area": "Klang",
    "address": "",
    "source": "https://playsportstogether.com/complex/dewan-sri-qamaria",
    "bookingUrl": "https://book.afa-sports.com/?auth=312",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "medalist-international-sports-centre",
    "name": "Medalist International Sports Centre",
    "kind": "badminton",
    "city": "Puchong",
    "area": "Puchong",
    "address": "",
    "source": "https://playsportstogether.com/complex/medalist-international-sports-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=294",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "setia-sports-arena",
    "name": "Setia Sport Arena",
    "kind": "badminton",
    "city": "Shah Alam",
    "area": "Shah Alam",
    "address": "",
    "source": "https://playsportstogether.com/complex/setia-sports-arena",
    "bookingUrl": "https://book.afa-sports.com/?auth=256",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "setia-alam-badminton-arena-65",
    "name": "Setia Alam Badminton Arena",
    "kind": "badminton",
    "city": "Shah Alam",
    "area": "Shah Alam",
    "address": "",
    "source": "https://playsportstogether.com/complex/setia-alam-badminton-arena-65",
    "bookingUrl": "https://book.afa-sports.com/?auth=238",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "andalas-sports-complex",
    "name": "Andalas Sports Complex",
    "kind": "badminton",
    "city": "Klang",
    "area": "Klang",
    "address": "",
    "source": "https://playsportstogether.com/complex/andalas-sports-complex",
    "bookingUrl": "https://book.afa-sports.com/?auth=225",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "badminton-batu-10-sports-complex",
    "name": "Badminton Batu 10 Sports Complex",
    "kind": "badminton",
    "city": "Cheras",
    "area": "Cheras",
    "address": "",
    "source": "https://playsportstogether.com/complex/badminton-batu-10-sports-complex",
    "bookingUrl": "https://book.afa-sports.com/?auth=224",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "smk-la-salle-pj-sports-facilities",
    "name": "SMK La Salle PJ Sports Facilities",
    "kind": "badminton",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "",
    "source": "https://playsportstogether.com/complex/smk-la-salle-pj-sports-facilities",
    "bookingUrl": "https://book.afa-sports.com/?auth=223",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "kemuning-lakeside-badminton-centre",
    "name": "Kemuning Lakeside Badminton Centre",
    "kind": "badminton",
    "city": "Shah Alam",
    "area": "Shah Alam",
    "address": "Jalan Anggerik Vanilla BE 31/BE, Kota Kemuning",
    "source": "https://playsportstogether.com/complex/kemuning-lakeside-badminton-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=222",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "goteam-sports-complex",
    "name": "GoTeam Sports Complex",
    "kind": "badminton",
    "city": "Klang",
    "area": "Klang",
    "address": "",
    "source": "https://playsportstogether.com/complex/goteam-sports-complex",
    "bookingUrl": "https://book.afa-sports.com/?auth=218",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "premierstar-badminton-academy",
    "name": "PremierStar Badminton Academy",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/premierstar-badminton-academy",
    "bookingUrl": "https://book.afa-sports.com/?auth=215",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "talent-champs-sports-complex",
    "name": "Talent Champs Sports Complex",
    "kind": "badminton",
    "city": "Kajang",
    "area": "Kajang",
    "address": "",
    "source": "https://playsportstogether.com/complex/talent-champs-sports-complex",
    "bookingUrl": "https://book.afa-sports.com/?auth=214",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "m-sports-arena",
    "name": "M Sports Arena",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/m-sports-arena",
    "bookingUrl": "https://book.afa-sports.com/?auth=212",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "rcp",
    "name": "RCP Racquet Club Puchong (Badminton & Pickleball)",
    "kind": "badminton",
    "city": "Puchong",
    "area": "Puchong",
    "address": "",
    "source": "https://playsportstogether.com/complex/rcp",
    "bookingUrl": "https://book.afa-sports.com/?auth=209",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "lavista-arena",
    "name": "LaVista Arena",
    "kind": "badminton",
    "city": "Bandar Baru Bangi",
    "area": "Bandar Baru Bangi",
    "address": "",
    "source": "https://playsportstogether.com/complex/lavista-arena",
    "bookingUrl": "https://book.afa-sports.com/?auth=208",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "sjk-c-tanjong-karang",
    "name": "SJK(C) Tanjong Karang",
    "kind": "badminton",
    "city": "Tanjong Karang",
    "area": "Tanjong Karang",
    "address": "",
    "source": "https://playsportstogether.com/complex/sjk-c-tanjong-karang",
    "bookingUrl": "https://book.afa-sports.com/?auth=200",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "bukit-serdang-alpha-badminton-complex",
    "name": "Bukit Serdang-Alpha Badminton Complex",
    "kind": "badminton",
    "city": "Seri Kembangan",
    "area": "Seri Kembangan",
    "address": "Jalan BS 5/18, Taman Bukit Serdang, Seri Kembangan",
    "source": "https://playsportstogether.com/complex/bukit-serdang-alpha-badminton-complex",
    "bookingUrl": "https://book.afa-sports.com/?auth=194",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "psc-parkcity-sports-centre",
    "name": "PSC Parkcity Sports Centre",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kepong",
    "address": "",
    "source": "https://playsportstogether.com/complex/psc-parkcity-sports-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=191",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "megah-rise-badminton-club",
    "name": "PJ-Megah Rise Badminton Club",
    "kind": "badminton",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "L3-23, Megah Rise Mall, Jalan SS 24/8, Taman Megah, Petaling Jaya",
    "source": "https://playsportstogether.com/complex/megah-rise-badminton-club",
    "bookingUrl": "https://book.afa-sports.com/?auth=171",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "sjk-c-puay-chai-2",
    "name": "Dewan Badminton SJK(C) Puay Chai 2",
    "kind": "badminton",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "",
    "source": "https://playsportstogether.com/complex/sjk-c-puay-chai-2",
    "bookingUrl": "https://book.afa-sports.com/?auth=180",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "arena-sukan-kuala-lumpur",
    "name": "Arena Sukan Kuala Lumpur",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/arena-sukan-kuala-lumpur",
    "bookingUrl": "https://book.afa-sports.com/?auth=172",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "ampang-jaya-badminton-club",
    "name": "Ampang Jaya Badminton Club",
    "kind": "badminton",
    "city": "Ampang",
    "area": "Ampang",
    "address": "",
    "source": "https://playsportstogether.com/complex/ampang-jaya-badminton-club",
    "bookingUrl": "https://book.afa-sports.com/?auth=163",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "subang-racquet-golf-centre",
    "name": "SRGC - Subang Racquet & Golf Centre",
    "kind": "badminton",
    "city": "Subang Jaya",
    "area": "Subang Jaya",
    "address": "",
    "source": "https://playsportstogether.com/complex/subang-racquet-golf-centre",
    "bookingUrl": "https://book.afa-sports.com/?auth=160",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "one-badminton-hall-taman-ehsan",
    "name": "One Badminton Hall Taman Ehsan",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "Lot 20, Level 8, Jalan E 1/5, Taman Perindustrian Ehsan Jaya, Kuala Lumpur",
    "source": "https://playsportstogether.com/complex/one-badminton-hall-taman-ehsan",
    "bookingUrl": "https://book.afa-sports.com/?auth=147",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "one-badminton-academy",
    "name": "One Badminton Academy",
    "kind": "badminton",
    "city": "Kuala Lumpur",
    "area": "Kuala Lumpur",
    "address": "",
    "source": "https://playsportstogether.com/complex/one-badminton-academy",
    "bookingUrl": "https://book.afa-sports.com/?auth=116",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "dstar-arena-challenger-sports-centre-ampang",
    "name": "DStar Arena Challenger Sports Centre Ampang",
    "kind": "badminton",
    "city": "Ampang",
    "area": "Ampang",
    "address": "",
    "source": "https://playsportstogether.com/complex/dstar-arena-challenger-sports-centre-ampang",
    "bookingUrl": "https://book.afa-sports.com/?auth=117",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "dewan-badminton-ko",
    "name": "Dewan Badminton Ko",
    "kind": "badminton",
    "city": "Klang",
    "area": "Klang",
    "address": "",
    "source": "https://playsportstogether.com/complex/dewan-badminton-ko",
    "bookingUrl": "https://book.afa-sports.com/?auth=105",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "new-vision-badminton-court",
    "name": "New Vision Badminton Court",
    "kind": "badminton",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "3, Jalan 13/1, Seksyen 13, 46200 Petaling Jaya, Selangor",
    "source": "https://playsportstogether.com/complex/new-vision-badminton-court",
    "bookingUrl": "https://book.afa-sports.com/?auth=34",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "yosin-court-1",
    "name": "Yosin Court 1",
    "kind": "badminton",
    "city": "Shah Alam",
    "area": "Shah Alam",
    "address": "",
    "source": "https://playsportstogether.com/complex/yosin-court-1",
    "bookingUrl": "https://book.afa-sports.com/?auth=24",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "bubble-sports-complex-cheras",
    "name": "Bubble Sports Complex Cheras",
    "kind": "badminton",
    "city": "Cheras",
    "area": "Cheras",
    "address": "",
    "source": "https://playsportstogether.com/complex/bubble-sports-complex-cheras",
    "bookingUrl": "https://book.afa-sports.com/?auth=7",
    "provider": "AFA",
    "description": "Choose a court and time in the centre’s online booking calendar."
  },
  {
    "id": "raja-tun-uda-library",
    "name": "Pustaka Raja Tun Uda",
    "kind": "study",
    "city": "Shah Alam",
    "area": "Seksyen 13",
    "address": "",
    "source": "https://www.ppas.gov.my/en/fasiliti/",
    "bookingUrl": "https://www.ppas.gov.my/en/bilik-perbincangan-2/",
    "provider": "Library",
    "description": "Quiet reading spaces and discussion rooms. Library membership and room rules apply."
  },
  {
    "id": "kuala-lumpur-library",
    "name": "Perpustakaan Kuala Lumpur",
    "kind": "study",
    "city": "Kuala Lumpur",
    "area": "Dataran Merdeka",
    "address": "",
    "source": "https://perpustakaankualalumpur.dbkl.gov.my/en/faq/",
    "bookingUrl": "https://perpustakaankualalumpur.dbkl.gov.my/en/faq/",
    "provider": "Library",
    "description": "Public library study spaces. Ask the library about group rooms and current access."
  },
  {
    "id": "pj-community-library",
    "name": "Perpustakaan Komuniti Petaling Jaya",
    "kind": "study",
    "city": "Petaling Jaya",
    "area": "Petaling Jaya",
    "address": "",
    "source": "https://www.mbpjlibrary.gov.my/portal/",
    "bookingUrl": "https://www.mbpjlibrary.gov.my/portal/index.php/perkhidmatan/",
    "provider": "Library",
    "description": "A public library option for reading and independent study. Check group-space arrangements with the library."
  },
  {
    "id": "jfkl-library",
    "name": "Japan Foundation Kuala Lumpur Library",
    "kind": "study",
    "city": "Kuala Lumpur",
    "area": "Mid Valley City",
    "address": "",
    "source": "https://www.jfkl.org.my/library/",
    "bookingUrl": "https://www.jfkl.org.my/library/",
    "provider": "Library",
    "description": "A quiet library for reading and study. Check opening days and visitor guidance before going."
  },
  {
    "id": "metime-jaya-one",
    "name": "MeTime Book Cafe · Jaya One",
    "kind": "study",
    "city": "Petaling Jaya",
    "area": "Jaya One",
    "address": "",
    "source": "https://www.metime.my/",
    "bookingUrl": "https://www.metime.my/",
    "provider": "Venue",
    "description": "Quiet rooms and cosy study spaces. Arrange a room or study session with the cafe."
  },
  {
    "id": "metime-kepong",
    "name": "MeTime Book Cafe · Kepong",
    "kind": "study",
    "city": "Kuala Lumpur",
    "area": "Kepong",
    "address": "",
    "source": "https://www.metime.my/",
    "bookingUrl": "https://www.metime.my/",
    "provider": "Venue",
    "description": "Book-cafe study spaces and quiet rooms. Contact the branch for room availability."
  },
  {
    "id": "sandbox-sri-petaling",
    "name": "Sandbox Space · Sri Petaling",
    "kind": "study",
    "city": "Kuala Lumpur",
    "area": "Sri Petaling",
    "address": "",
    "source": "https://www.sandboxco.space/",
    "bookingUrl": "https://www.sandboxco.space/meeting-room-for-rent",
    "provider": "Venue",
    "description": "Day passes and group meeting rooms. Student day passes are listed by the operator."
  },
  {
    "id": "sandbox-sunway",
    "name": "Sandbox Space · Bandar Sunway",
    "kind": "study",
    "city": "Petaling Jaya",
    "area": "Bandar Sunway",
    "address": "",
    "source": "https://www.sandboxco.space/",
    "bookingUrl": "https://www.sandboxco.space/meeting-room-for-rent",
    "provider": "Venue",
    "description": "Study with a day pass or request a group room. Ask the venue about student rates."
  },
  {
    "id": "worq-ttdi",
    "name": "WORQ · TTDI",
    "kind": "study",
    "city": "Kuala Lumpur",
    "area": "Glo Damansara Shopping Mall",
    "address": "",
    "source": "https://worq.space/locations-flexible-space/",
    "bookingUrl": "https://booking.worq.space/meeting-room",
    "provider": "Venue",
    "description": "Paid coworking desks and bookable meeting rooms. Choose a location and time in the operator calendar."
  },
  {
    "id": "worq-mutiara",
    "name": "WORQ · Mutiara Damansara",
    "kind": "study",
    "city": "Petaling Jaya",
    "area": "Surian Tower",
    "address": "",
    "source": "https://worq.space/locations-flexible-space/",
    "bookingUrl": "https://booking.worq.space/meeting-room",
    "provider": "Venue",
    "description": "Paid coworking and group meeting rooms. Confirm the room capacity in the booking calendar."
  },
  {
    "id": "worq-subang",
    "name": "WORQ · Subang",
    "kind": "study",
    "city": "Subang Jaya",
    "area": "UOA Business Park",
    "address": "",
    "source": "https://worq.space/locations-flexible-space/",
    "bookingUrl": "https://booking.worq.space/meeting-room",
    "provider": "Venue",
    "description": "Paid desks and meeting spaces for group work. Room availability is managed by WORQ."
  },
  {
    "id": "worq-bangsar",
    "name": "WORQ · Bangsar",
    "kind": "study",
    "city": "Kuala Lumpur",
    "area": "Menara UOA Bangsar",
    "address": "",
    "source": "https://worq.space/locations-flexible-space/",
    "bookingUrl": "https://booking.worq.space/meeting-room",
    "provider": "Venue",
    "description": "Paid coworking and bookable rooms with a live operator booking calendar."
  }
]
$places$::jsonb)x
on conflict(id)do update set name=excluded.name,city=excluded.city,address=excluded.address,source_url=excluded.source_url,checked_at=excluded.checked_at,kind=excluded.kind,booking_url=excluded.booking_url,provider=excluded.provider;

create function public.afterbell_mutate_v3(operation text,payload jsonb)returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;entity uuid;venue venues%rowtype;label_value text;status_value text;ref_value text;
begin
 if auth.uid()is null then raise exception 'Authentication required';end if;
 result:=afterbell_mutate_v2(operation,payload);
 if operation='profile'then
  if nullif(payload->>'schoolHubId','')is not null then perform afterbell_social_mutate('selectSchool',jsonb_build_object('id',payload->>'schoolHubId'));
  else update profiles set school_hub_id=null where id=auth.uid();end if;
 end if;
 if operation in('createSpark','updateSpark')then
  entity:=(result->>'id')::uuid;
  select * into venue from venues where id=nullif(payload->>'venueId','');
  if venue.id is not null and(venue.city<>payload->>'city'or(venue.kind='badminton'and payload->>'category'<>'badminton')or(venue.kind='study'and payload->>'category'not in('study','tutoring')))then raise exception 'Choose a place matching the activity and city';end if;
  label_value:=trim(coalesce(payload->>'spaceLabel',''));status_value:=coalesce(payload->>'bookingStatus','planned');ref_value:=trim(coalesce(payload->>'bookingReference',''));
  if length(label_value)>50 or length(ref_value)>100 or status_value not in('planned','booked')then raise exception 'Invalid booking details';end if;
  if venue.id is null and(label_value<>''or ref_value<>''or status_value<>'planned')then raise exception 'Choose a centre before adding booking details';end if;
  if status_value='booked'and(label_value=''or ref_value=''or jsonb_array_length(payload->'windows')<>1)then raise exception 'Add the booked court or room, reference and one confirmed time';end if;
  update sparks set space_label=label_value,booking_status=status_value where id=entity;
  delete from venue_booking_references where spark_id=entity;
  if ref_value<>''then insert into venue_booking_references values(entity,auth.uid(),ref_value);end if;
 end if;
 return result;
end$$;

create function public.afterbell_workspace_v2()returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare base jsonb;extra jsonb;
begin
 if auth.uid()is null then raise exception 'Authentication required';end if;
 base:=afterbell_workspace();
 select coalesce(jsonb_agg(e||jsonb_build_object('spaceLabel',s.space_label,'bookingStatus',s.booking_status,'bookingReference',case when s.owner_id=auth.uid()then coalesce((select reference from venue_booking_references where spark_id=s.id),'')else''end)),'[]'::jsonb)into extra from jsonb_array_elements(base->'sparks')e join sparks s on s.id=(e->>'id')::uuid where can_access_spark(s.id);
 return base||jsonb_build_object('sparks',extra);
end$$;
revoke all on function public.afterbell_mutate_v3(text,jsonb),public.afterbell_workspace_v2()from public,anon;
grant execute on function public.afterbell_mutate_v3(text,jsonb),public.afterbell_workspace_v2()to authenticated;
