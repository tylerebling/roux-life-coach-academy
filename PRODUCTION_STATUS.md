# Roux Life Academy Production Status

## Live Supabase backend

- Project: Roux Life Coach Academy
- Project reference: `dwkjwzissuaahieapkxo`
- Project URL: `https://dwkjwzissuaahieapkxo.supabase.co`
- Course catalog: 1 course, 19 lessons
- Final examination: 20 server-only questions, 80% passing score
- Security advisors: no findings after deployment

### Active Edge Functions

- `academy-progress` — authenticated enrollment and earned progress
- `academy-final-exam` — authenticated server-side grading and certificate issuance
- `academy-verify-certificate` — public permanent credential verification
- `create-academy-checkout` — authenticated Stripe Checkout creation
- `stripe-academy-webhook` — signed payment/refund processing
- `academy-admin` — protected administrator operations and audit history
- `academy-asset-url` — enrolled-learner signed access to private academy media

## Administrator center

- Route: `/academy/admin/`
- Users and secure password-recovery initiation
- Enrollment activation and revocation
- Lesson progress review and owner-only resets
- Certificate status management and revocation reasons
- Billing visibility and owner-only Stripe refunds
- Course price, Stripe Price ID, and publication controls
- Immutable administrator audit history

Set `ACADEMY_ADMIN_EMAILS` to a comma-separated owner email allowlist to bootstrap the first administrator. After the admin migration is applied, administrators can also be added to `academy_admins` using their authenticated user ID.

For protected media stored in the separate paid Storage project, also set:

- `ACADEMY_STORAGE_URL=https://qguskjvnfpnxfuroixzw.supabase.co`
- `ACADEMY_STORAGE_SECRET_KEY` to a secret/server key from that Storage project

Never place `ACADEMY_STORAGE_SECRET_KEY` in browser code or source control.

## Required before paid enrollment

Set these Supabase Edge Function secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_ACADEMY_WEBHOOK_SECRET`
- `ACADEMY_SITE_URL`

Then update `academy_courses.price_cents` and `academy_courses.stripe_price_id`.

Until a paid price is configured, the course uses free active enrollment for authenticated learners.

## Vercel publication

The website frontend belongs on Vercel. The local academy is already configured with the Supabase project URL and publishable key. Publishing remains pending because the actual `life-coach-iq` Vercel project is not currently visible to the connected Vercel account.

Do not publish the 462 MB Lesson 1 video directly through Git. Move large video/audio files to protected object storage or another approved media CDN before the production Vercel deployment.
