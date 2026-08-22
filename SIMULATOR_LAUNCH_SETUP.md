# Life Coach Simulator — Academy launch setup

The Academy hands an authenticated student to the shared Life Coach Simulator
at `https://simulator.clientgatehq.com`. It is not a link: the backend signs a
short-lived statement about who the student is, and the simulator verifies it.

## The flow

```
student clicks "Open Simulator"
  → simulator-launch edge function
      verifies the bearer token
      checks academy_enrollments for an active enrollment
      signs Ed25519 claims with the Academy's OWN private key
  → browser top-level form POST to the simulator
  → simulator verifies, sets its own session cookie, opens the app
```

No launch ever appears in a URL. The private key never leaves this backend, so
a compromise of the simulator cannot mint an Academy student's identity.

## Function secrets

Set on this project only. `LCIQ_SIM_LAUNCH_PRIVATE_KEY` is the **private** half
of the Academy's Ed25519 pair and must never be committed, logged, or shared
with the simulator — the simulator holds only the public half.

```bash
supabase secrets set --project-ref dwkjwzissuaahieapkxo LCIQ_SIM_LAUNCH_PRIVATE_KEY="$(cat roux-2026-01.private.pem)"
```

```bash
supabase secrets set --project-ref dwkjwzissuaahieapkxo LCIQ_SIM_LAUNCH_KID=roux-2026-01 LCIQ_SIM_ORIGIN=https://simulator.clientgatehq.com ACADEMY_ORIGIN=https://rouxlife.com
```

Deploy:

```bash
supabase functions deploy simulator-launch --project-ref dwkjwzissuaahieapkxo
```

## What the simulator needs from us

Only the **public** key, as one entry in its `LCIQ_SIM_LAUNCH_PUBLIC_KEYS`:

```
ROUX_LIFE_ACADEMY:roux-2026-01:<base64 SPKI public key>
```

## Rotation

Add, switch, then remove — never the other order.

1. Generate the next pair; give the simulator the new **public** key under a new
   `kid` (`roux-2026-02`). It accepts both at once.
2. Set `LCIQ_SIM_LAUNCH_KID=roux-2026-02` and the new private key here.
3. Wait out the maximum launch lifetime — five minutes — so nothing signed with
   the old key is still in flight.
4. Remove the old public key from the simulator.

## What must not happen

- The private key must not be shared with LifeCoachIQ. Each product signs with
  its own pair; a shared pair would let either mint the other's launches, and
  the simulator refuses to start if it is given one key for both.
- The button must not become a plain hyperlink to the simulator. An
  unauthenticated visitor arriving that way has no launch and no entitlement.
- No student PII belongs in the claims beyond the opaque `userId` the simulator
  needs to keep sessions apart.
