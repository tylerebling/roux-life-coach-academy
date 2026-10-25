# Lauren block-practice integration

Status: local design contract; do not deploy until both repositories pass the
contract tests and the complete learner journey has been reviewed.

## Curriculum checkpoints

| Checkpoint | Lessons completed | Assignment | Scenario scope | Duration |
| --- | --- | --- | --- | --- |
| `block-03-06` | 3–6 | `sim-career-change` | `confidence-career-change` | 5 minutes |
| `block-07-10` | 7–10 | `sim-relationship-disconnection` | `relationship-disconnection` | 5 minutes |
| `block-11-14` | 11–14 | `sim-life-transition` | `life-transition-identity` | 5 minutes |
| `block-15-18` | 15–18 | `sim-workplace-burnout` | `workplace-burnout-identity` | 5 minutes |
| `lesson-19-capstone` | 19 | `sim-capstone` | server-selected capstone case | capstone policy |

These assignments use only competencies taught at or before their checkpoint.
Scenario text and evaluation rubrics remain owned by the simulator repository;
the Academy owns sequencing and progression.

## Learner sequence

For the final lesson in each block:

1. The lesson presentation reaches eight minutes remaining.
2. The Academy requests one idempotent prewarm reservation in the background.
3. The learner completes the presentation.
4. The next panel says, “Let’s test what you have learned,” and opens the
   assigned five-minute Lauren practice.
5. Lauren claims the existing reservation. It must not allocate a second
   worker for the same learner and checkpoint.
6. At five minutes the simulator ends cleanly and produces an evaluation.
7. The learner sees the evaluation, then continues to the existing lesson
   review, questions, and workbook.
8. Academy progression records the simulator attempt and the existing lesson
   requirements independently. Reviewing old content never repeats or erases a
   passed simulation.

## Shared server contract

The browser never signs a launch, receives a private key, or calls a compute
provider directly.

### Prewarm

`POST /api/integrations/roux-academy/prewarm`

The Academy backend sends a separately signed, single-purpose assertion with:

- `contractVersion`
- `purpose: "prewarm"`
- `reservationId`
- `sourceProduct: "ROUX_LIFE_ACADEMY"`
- opaque Academy `userId`
- `checkpointId`
- exactly one `scenarioSlug`
- `durationSeconds: 300`
- `issuedAtSec` and `expiresAtSec`

The simulator verifies the Academy signature, validates the checkpoint mapping,
and idempotently prepares capacity keyed by `(sourceProduct, userId,
checkpointId)`. A reservation expires automatically if the learner never
arrives. No microphone, camera, transcript, or learner-visible session starts
during prewarm.

### Launch

The existing signed launch remains a top-level form POST. Its next contract
version adds `checkpointId`, `assignmentId`, `durationSeconds`, and
`reservationId`. `scenarioScope` contains exactly one permitted scenario.
The simulator claims the matching reservation or safely falls back to normal
preparation if it expired.

### Completion

The simulator posts a signed, replay-safe result to an Academy Edge Function:

- `attemptId`
- `reservationId`
- `checkpointId`
- `assignmentId`
- `startedAtSec` / `completedAtSec`
- `durationSeconds`
- overall and target-competency scores
- critical-safety-failure flag
- pass/remediation status

The Academy verifies the simulator signature and persists only the compact
evaluation. Transcripts, hidden client facts, model prompts, and raw audio do
not cross the product boundary.

## Progress rules

- A checkpoint unlocks only after its final lesson presentation is complete.
- A five-minute session is required; disconnects may resume the same active
  reservation within its grace period.
- A critical safety failure cannot pass.
- A failed attempt shows feedback and a retry path; it does not erase completed
  lessons.
- The capstone follows the simulator's stricter capstone rubric and instructor
  review policy.

## Ownership between Codex and Claude

- Academy repository: lesson timing trigger, signed prewarm request, launch
  claims, callback verification, progress persistence, checkpoint UI.
- Simulator repository: reservation endpoint, worker preparation/claim,
  five-minute timer, evaluation, signed completion callback, scenario/rubric
  catalog.
- Shared: this contract and cross-repository conformance fixtures. A contract
  change lands in both repositories before either side is deployed.

## Acceptance checks

- Exactly one reservation/worker allocation per learner and checkpoint.
- Trigger fires once when remaining presentation time crosses eight minutes,
  including after pause, rewind, reload, and admin preview.
- Admin preview never creates billable capacity unless an explicit test flag is
  supplied.
- A learner arriving before, during, or after prewarm gets a truthful status.
- The session ends at five minutes and returns one signed evaluation.
- Forged, expired, replayed, mismatched-user, mismatched-checkpoint, and
  out-of-scope scenario requests fail closed.
- Existing review, quiz, workbook, lesson review, and historical review flows
  remain intact.

