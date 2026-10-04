# Bright Data → teammate Supabase guide

No Bright Data or Supabase credentials are stored in this repository. Keep all keys server-side except the Supabase anon key used for browser sign-in.

## 1. Confirm and protect the promotional credit

1. Sign in to Bright Data, open **Billing**, and confirm the available promotional credit and expiry. Bright Data’s published free tier currently describes 5,000 monthly credits (about $7.50), not a universal $100 grant; if your account shows a separate $100 promotion, use the actual expiry and terms displayed there.
2. Create the narrowest product zone needed (Web Unlocker or SERP API), create an API token, and set a hard monthly spend limit below the available credit.
3. Collect only public, permitted sources such as ClinicalTrials.gov and official disease-foundation pages. Do not collect private groups, patient posts, profiles, or any personal health information. Check each source’s terms and Bright Data’s acceptable-use rules first.

## 2. Connect your teammate’s Supabase project

1. In their Supabase SQL Editor, apply the migrations in `supabase/migrations/` in order, including `20261003000012_family_network.sql`.
2. In Supabase Auth, keep the **Email** provider enabled with signups allowed, and leave **Confirm email** off so a new account signs in on submit. Set the minimum password length to 8 to match the form. No redirect URLs are needed: sign-in happens in the page, not through an emailed link.
3. Put `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env` for browser sign-in only. Put `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `BRIGHT_DATA_API_KEY` in the backend/deployment environment. Never prefix service-role or Bright Data keys with `VITE_`.

## 3. Ingest a small real-time source set

1. The existing Bright Data integration boundary is `backend/app/brightdata/`; the discovery pipeline is `backend/app/discovery/`.
2. Start with a small scheduled query list such as `STXBP1 natural history study` and `STXBP1 Foundation Circle`.
3. For each result, save canonical URL, retrieval time, source type, original payload, query, and cost. Deduplicate by canonical URL plus source update time.
4. Store items as `pending_review`; an evidence reviewer must approve them before they appear to families.

## 4. Make real data visible safely

1. Use the backend service-role client (or a Supabase Edge Function), never the browser, to upsert approved public source records into `nodes`, `edges`, and `evidence`.
2. Render only approved, public study/community metadata in match cards. RLS keeps profiles, introductions, messages, and reports private.
3. Test with separate family, steward, and evidence-reviewer accounts. A family account must not be able to read other profiles, Circle messages, reports, or the evidence layer.

## Before the demo

- Confirm Bright Data spend cap and credit expiry.
- Verify email-and-password sign-in, and that creating an account lands straight in `/family`.
- Have an evidence reviewer approve one live study record.
- Verify every suggestion shows its source and why it was suggested.
