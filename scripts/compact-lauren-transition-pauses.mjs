import { spawnSync } from 'node:child_process'
import { mkdirSync, renameSync, rmSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const files = process.argv.slice(2).map((file) => resolve(file))
if (!files.length) throw new Error('Pass one or more transition MP4 files.')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.status !== 0) {
    throw new Error(`${command} failed for ${args.at(-1)}\n${result.stderr || result.stdout}`)
  }
  return result
}

function durationOf(file) {
  const result = run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', file,
  ])
  return Number(result.stdout.trim())
}

function longSilences(file) {
  const result = spawnSync('ffmpeg', [
    '-hide_banner', '-i', file,
    '-af', 'silencedetect=noise=-42dB:d=1.2',
    '-f', 'null', process.platform === 'win32' ? 'NUL' : '/dev/null',
  ], { encoding: 'utf8' })
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
  const events = [...text.matchAll(/silence_(start|end):\s*(-?\d+(?:\.\d+)?)/g)]
  const silences = []
  let start = null
  for (const [, kind, raw] of events) {
    const value = Math.max(0, Number(raw))
    if (kind === 'start') start = value
    else if (start !== null) {
      silences.push({ start, end: value })
      start = null
    }
  }
  return silences
}

function keepIntervals(duration, silences) {
  const cuts = silences.map(({ start, end }) => {
    if (start < 0.1) return { start: 0, end: Math.max(0, end - 0.65) }
    if (end > duration - 0.15) return { start: Math.min(duration, start + 0.5), end: duration }
    // Keep a short breath on each side of a take boundary. The result feels
    // continuous without making Lauren sound mechanically rushed.
    return { start: start + 0.28, end: end - 0.28 }
  }).filter(({ start, end }) => end - start > 0.05)

  const keeps = []
  let cursor = 0
  for (const cut of cuts) {
    if (cut.start > cursor + 0.03) keeps.push({ start: cursor, end: cut.start })
    cursor = Math.max(cursor, cut.end)
  }
  if (cursor < duration - 0.03) keeps.push({ start: cursor, end: duration })
  return keeps
}

for (const file of files) {
  const duration = durationOf(file)
  const silences = longSilences(file)
  const keeps = keepIntervals(duration, silences)
  if (keeps.length < 2) {
    console.log(`${basename(file)}: no long production gaps found`)
    continue
  }

  const chains = []
  const inputs = []
  keeps.forEach(({ start, end }, index) => {
    chains.push(
      `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${index}]`,
      `[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${index}]`,
    )
    inputs.push(`[v${index}][a${index}]`)
  })
  chains.push(`${inputs.join('')}concat=n=${keeps.length}:v=1:a=1[outv][outa]`)

  const outputDirectory = join(dirname(file), '.continuous')
  mkdirSync(outputDirectory, { recursive: true })
  const output = join(outputDirectory, basename(file))
  rmSync(output, { force: true })
  run('ffmpeg', [
    '-hide_banner', '-y', '-i', file,
    '-filter_complex', chains.join(';'),
    '-map', '[outv]', '-map', '[outa]',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', output,
  ], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' })

  const compactDuration = durationOf(output)
  renameSync(output, file)
  console.log(`${basename(file)}: ${duration.toFixed(1)}s -> ${compactDuration.toFixed(1)}s (${silences.length} long gaps tightened)`)
}
