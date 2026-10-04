-- seed_social.sql
--
-- Demo content for the family network: six community posts and six reels.
--
-- Run it after the migrations, with the service role (the SQL editor, or
-- `psql` with the connection string). The browser cannot insert these: the RLS
-- policies require `author_id = auth.uid()` and these rows have no author, by
-- design -- they are community and circle posts, not any one person's.
--
-- The app falls back to the same content compiled into
-- frontend/src/lib/social-feed.ts when these tables are empty, so seeding is
-- optional. Seed it when you want the demo to exercise the real path: real
-- ids, real likes, real comments, real-time delivery to a second browser.
--
-- Safe to re-run: every insert is keyed on a deterministic id.

-- ---------------------------------------------------------------- posts ----
insert into public.posts
  (id, author_id, author_name, author_role, condition, biology_badge, body,
   image_url, tags, evidence_badge, evidence_link, likes_count, comments_count, created_at)
values
  ('11111111-1111-4111-8111-000000000001', null, 'Elena Rostova', 'Caregiver',
   'STXBP1 encephalopathy', 'Presynaptic Vesicle Fusion',
   'Milestone day for our family. After six months of systematic seizure tracking with our pediatric neurologist, Leo went 45 days without a focal seizure cluster. To any parents just starting this: keeping an hourly sleep and meal log made all the difference in spotting triggers. You are not alone in this.',
   'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=900&q=80',
   array['#STXBP1', '#SeizureDiary', '#CaregiverWins', '#SchoolAge'],
   'Reviewed Natural-History Measure', 'https://clinicaltrials.gov/study/NCT06555965',
   34, 2, now() - interval '2 hours'),

  ('11111111-1111-4111-8111-000000000002', null, 'STXBP1 Foundation Circle', 'Steward',
   'SNARE Complex Disorders', 'Shared SNARE Pathway',
   'Reminder for circle members: our monthly parent-led introduction circle meets this Thursday at 7 PM ET. We will discuss speech-generating AAC devices, sensory integration strategies, and the latest trial pipeline update. Tap to RSVP or join the conversation.',
   null,
   array['#CommunityCircle', '#AACDevices', '#ParentSupport', '#STXBP1'],
   'Moderated Circle · Verified Non-Profit', null,
   52, 1, now() - interval '5 hours'),

  ('11111111-1111-4111-8111-000000000003', null, 'David Chen', 'Patient',
   'Episodic ataxia type 2', 'Calcium Channelopathy',
   'A lot of newly diagnosed adults ask how to explain fluctuating ataxia to employers. I built a one-page work accommodation sheet with my neurologist that outlines good days versus flare days without the medical jargon. Happy to share the template with anyone in our circle.',
   null,
   array['#CACNA1A', '#AdultRareDisease', '#Accommodations', '#PeerResource'],
   'Verified Community Asset', null,
   28, 0, now() - interval '1 day'),

  ('11111111-1111-4111-8111-000000000004', null, 'Priya Raman', 'Caregiver',
   'SCN2A-related disorder', 'Neuronal Excitability',
   'Nobody warned me that the hardest part of an AAC device would be us, not her. We spent two weeks modelling it ourselves before Aanya touched it, narrating our own day out loud and tapping the buttons while we talked. Week three she asked for music, unprompted. If you are in week one and it feels pointless: it is not. Keep modelling.',
   'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=80',
   array['#AACDevices', '#SCN2A', '#Communication', '#CaregiverWins'],
   null, null,
   61, 1, now() - interval '2 days'),

  ('11111111-1111-4111-8111-000000000005', null, 'Sarah Jenkins', 'Caregiver',
   'KCNQ2 encephalopathy', 'Potassium Channel',
   'Four years of broken sleep and I had stopped believing anything would shift it. Our sleep clinic built a routine around Noah''s actual wake pattern instead of a textbook one: same wake time every day including weekends, light exposure within ten minutes, no screens after the bath. It took eleven weeks, not the two the leaflet promised. Posting the honest timeline because the leaflets made me feel like I was failing.',
   null,
   array['#SleepRoutine', '#KCNQ2', '#HonestTimelines'],
   null, null,
   94, 0, now() - interval '3 days'),

  ('11111111-1111-4111-8111-000000000006', null, 'STXBP1 Foundation Circle', 'Steward',
   'SNARE Complex Disorders', 'Shared SNARE Pathway',
   'Hospital bag thread, crowd-sourced from 40 families and now pinned to the circle. Top three things people wish they had packed: a printed one-page medication summary (wards lose the digital one), your child''s own pillow, and a spare phone charger with a long cable because the socket is never near the bed. Add yours in the comments and we will fold it into the list.',
   'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80',
   array['#HospitalPrep', '#CommunityCircle', '#PeerWisdom'],
   'Moderated Circle · Verified Non-Profit', null,
   118, 0, now() - interval '4 days')
on conflict (id) do nothing;

-- ------------------------------------------------------------- comments ----
insert into public.post_comments (id, post_id, user_id, author_name, body, created_at)
select v.id, v.post_id, v.user_id, v.author_name, v.body, v.created_at
from (values
  ('22222222-2222-4222-8222-000000000001'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
   null::uuid, 'Marcus Vance',
   'So happy for you and Leo. Did you notice any correlation with bedtime temperature? We are seeing that in our child.',
   now() - interval '1 hour'),
  ('22222222-2222-4222-8222-000000000002'::uuid, '11111111-1111-4111-8111-000000000001'::uuid,
   null::uuid, 'Elena Rostova',
   'Yes. Keeping the room at 19C significantly reduced the nighttime waking clusters.',
   now() - interval '45 minutes'),
  ('22222222-2222-4222-8222-000000000003'::uuid, '11111111-1111-4111-8111-000000000002'::uuid,
   null::uuid, 'Sarah Jenkins',
   'Looking forward to this. AAC was a game changer for non-verbal frustration here.',
   now() - interval '3 hours'),
  ('22222222-2222-4222-8222-000000000004'::uuid, '11111111-1111-4111-8111-000000000004'::uuid,
   null::uuid, 'Sarah Jenkins',
   'The modelling point is the one our speech therapist kept repeating and I kept skipping. Thank you for saying it plainly.',
   now() - interval '1 day')
) as v(id, post_id, user_id, author_name, body, created_at)
on conflict (id) do nothing;

-- ---------------------------------------------------------------- reels ----
-- Pexels free-licence clips. Each URL was checked to answer with a real
-- video/mp4; the previous demo set had started returning 403, which is why the
-- reels tab showed a frozen poster frame and never played.
insert into public.reels
  (id, author_id, author_name, author_role, condition, title, caption,
   video_url, thumbnail_url, duration, tags, likes_count, created_at)
values
  ('33333333-3333-4333-8333-000000000001', null, 'Elena & Leo', 'Caregiver Story', 'STXBP1',
   'Morning sensory routine that changed our day',
   'Deep pressure weighted blanket plus a five minute low-stimulation transition before school.',
   'https://videos.pexels.com/video-files/4267867/4267867-sd_640_360_30fps.mp4',
   'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=600&q=80',
   '0:42', array['#SensoryDiet', '#MorningRoutine', '#STXBP1'], 142, now() - interval '1 day'),

  ('33333333-3333-4333-8333-000000000002', null, 'Marcus Vance', 'Dad of 7yo', 'SNARE Pathway',
   'How we track seizure clusters in real time',
   'Our setup for syncing wearable logs with clinical visit notes. No spreadsheets required.',
   'https://videos.pexels.com/video-files/8208434/8208434-sd_640_360_30fps.mp4',
   'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=600&q=80',
   '1:05', array['#SeizureTracking', '#CaregiverTips', '#DigitalHealth'], 98, now() - interval '3 days'),

  ('33333333-3333-4333-8333-000000000003', null, 'Dr. Kwesi Osei', 'Clinical Geneticist',
   'Presynaptic Vesicle Fusion',
   'What does "SNARE complex" mean for your child?',
   'A thirty second primer on vesicle fusion biology, in plain English without the jargon.',
   'https://videos.pexels.com/video-files/7331152/7331152-sd_640_360_25fps.mp4',
   'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=600&q=80',
   '0:38', array['#BiologyExplained', '#ScienceForFamilies', '#NeuroGenetics'], 310, now() - interval '4 days'),

  ('33333333-3333-4333-8333-000000000004', null, 'Priya & Aanya', 'Caregiver Story', 'SCN2A',
   'Our first week with an AAC device',
   'What we got wrong, what finally clicked, and the three buttons Aanya reached for first.',
   'https://videos.pexels.com/video-files/6296764/6296764-sd_640_360_25fps.mp4',
   'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80',
   '1:12', array['#AACDevices', '#Communication', '#SCN2A'], 176, now() - interval '5 days'),

  ('33333333-3333-4333-8333-000000000005', null, 'The SNARE Circle', 'Moderated Circle',
   'SNARE Complex Disorders',
   'Packing for a hospital stay, from families who have done it',
   'The crowd-sourced list: comfort items, the medication binder, and what the ward never has.',
   'https://videos.pexels.com/video-files/6181457/6181457-sd_640_360_25fps.mp4',
   'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80',
   '0:55', array['#HospitalPrep', '#PeerWisdom', '#CommunityCircle'], 204, now() - interval '7 days'),

  ('33333333-3333-4333-8333-000000000006', null, 'Sarah Jenkins', 'Mum of 5yo', 'KCNQ2',
   'Sleep, after four years of none',
   'The routine our sleep clinic built with us, and the honest version of how long it took.',
   'https://videos.pexels.com/video-files/7456460/7456460-sd_640_360_30fps.mp4',
   'https://images.unsplash.com/photo-1527613426441-4da17471b66d?auto=format&fit=crop&w=600&q=80',
   '1:20', array['#SleepRoutine', '#KCNQ2', '#CaregiverWins'], 261, now() - interval '8 days')
on conflict (id) do nothing;
