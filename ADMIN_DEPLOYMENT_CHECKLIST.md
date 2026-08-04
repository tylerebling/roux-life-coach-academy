# Roux Life Academy Administrator Deployment

## Supabase learner backend

Project: `dwkjwzissuaahieapkxo`

1. Apply migration `20260803000300_add_academy_admin.sql`.
2. Deploy Edge Functions `academy-admin` and `academy-asset-url`.
3. Set `ACADEMY_ADMIN_EMAILS` to the owner's email address. Separate multiple approved owner emails with commas.
4. Set `ACADEMY_STORAGE_URL=https://qguskjvnfpnxfuroixzw.supabase.co`.
5. Set `ACADEMY_STORAGE_SECRET_KEY` using a secret/server key from the paid Storage project.
6. Keep Stripe secrets and `ACADEMY_SITE_URL` configured before accepting payment.

## Production website

Publish the contents of `ROUX_LIFE_ACADEMY_WIRED_V1` at `/academy/` on the production website. Do not include the packaged Lesson 1 MP4 in the website deployment; authenticated playback is requested from private Supabase Storage through `academy-asset-url`.

The administrator route is `/academy/admin/`.

## Security guarantees

- The administrator page never receives a service key.
- Administrator authorization comes from `academy_admins` or the server-only bootstrap allowlist, never editable user metadata.
- Passwords are never readable. The interface only initiates secure recovery email flows.
- Refunds, access changes, progress resets, and credential changes are server-side and recorded in the audit log.
- Certificate verification continues to use the public verification function without exposing private learner records.
