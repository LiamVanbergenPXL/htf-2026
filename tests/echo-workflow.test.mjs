import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import test from 'node:test'
import Database from 'better-sqlite3'
import { toJSON } from 'seroval'

// SQL below runs against a temporary database created for each test run.
// Suppress only the IDE datasource warning; SQL validation remains enabled.

test('echo reporting and commander permissions through real HTTP server functions', { timeout: 60000 }, async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'htf-echo-test-'))
  const databasePath = join(dir, 'test.db')
  const env = { ...process.env, NODE_ENV: 'development', DB_FILE_NAME: databasePath, OLLAMA_BASE_URL: 'http://127.0.0.1:1/v1' }
  let server
  let sqlite
  let logs = ''
  try {
    // Use the real schema and account seed, never the developer's database.
    execFileSync(process.execPath, ['node_modules/drizzle-kit/bin.cjs', 'push', '--force'], { env, stdio: 'pipe' })
    execFileSync(process.execPath, ['src/db/seed-accounts.ts'], { env, stdio: 'pipe' })
    sqlite = new Database(databasePath)
    sqlite.pragma('foreign_keys = ON')
    const listener = createServer()
    listener.listen(0, '127.0.0.1')
    await once(listener, 'listening')
    const port = listener.address().port
    await new Promise((resolve) => listener.close(resolve))
    const base = `http://localhost:${port}`
    server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'dev', '--port', String(port), '--strictPort'], {
      env, cwd: resolve('.'), stdio: ['ignore', 'pipe', 'pipe'],
    })
    server.stdout.on('data', (chunk) => { logs += chunk })
    server.stderr.on('data', (chunk) => { logs += chunk })
    let ready = false
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null) throw new Error(logs)
      try {
        const response = await fetch(`${base}/login`)
        if (response.ok) { ready = true; break }
      } catch { /* wait for the listener */ }
      await delay(100)
    }
    assert.ok(ready, logs)
    const endpoints = {}
    for (const file of ['auth', 'echoes', 'glitches', 'auri']) {
      const source = await (await fetch(`${base}/src/lib/${file}.functions.ts`)).text()
      for (const match of source.matchAll(/export const (\w+) = [^\n]*createClientRpc\("([^"]+)"/g)) {
        endpoints[match[1]] = `${base}/_serverFn/${match[2]}`
      }
    }
    async function rpc(name, data, cookie = '') {
      assert.ok(endpoints[name], `Missing endpoint ${name}`)
      const multipart = data instanceof FormData
      const response = await fetch(endpoints[name], {
        method: name === 'getGlitches' ? 'GET' : 'POST', redirect: 'manual',
        headers: { origin: base, cookie, ...(!multipart ? { 'content-type': 'application/json' } : {}), 'x-tsr-serverFn': 'true', accept: 'application/json' },
        body: name === 'getGlitches' ? undefined : multipart ? data : JSON.stringify(toJSON({ data })),
      })
      return { response, body: await response.text() }
    }
    async function login(codename, password) {
      const { response, body } = await rpc('loginFn', { codename, password })
      assert.equal(response.status, 200, body)
      const cookie = response.headers.getSetCookie().findLast(value => /guardian-session=[a-f0-9]{64}/.test(value))
      assert.ok(cookie, body)
      return cookie.split(';')[0]
    }
    const defender = await login('defender', 'Defender2026!')
    const commander = await login('commander', 'Commander2026!')
    // noinspection SqlNoDataSourceInspection
    const count = (table) => sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get().n
    let glitchId

    await t.test('AI chat requires login and reports an offline Ollama without making up answers', async () => {
      const anonymous = await rpc('askAuri', { question: 'Welke incidenten zijn actief?' })
      assert.match(anonymous.body, /login/)
      for (const cookie of [defender, commander]) {
        const result = await rpc('askAuri', { question: 'Welke incidenten zijn actief?' }, cookie)
        assert.match(result.body, /Ollama/)
        assert.equal(count('glitches'), 0)
      }
    })

    await t.test('anonymous reporting and status changes are blocked', async () => {
      for (const [name, input] of [
        ['reportEcho', { description: 'anonymous' }],
        ['updateGlitchStatus', { glitchId: 'missing', status: 'FIXED' }],
      ]) {
        const { body } = await rpc(name, input)
        assert.match(body, /login/)
      }
      assert.equal(count('glitches'), 0)
      assert.equal(count('echoes'), 0)
    })

    await t.test('defender report creates two linked records using server identity and time', async () => {
      const before = Date.now()
      const { response, body } = await rpc('reportEcho', {
        description: '  Magic fading near the tower  ',
        reportingGuardianId: 'guardian-commander', timestamp: '2000-01-01', status: 'FIXED',
      }, defender)
      assert.equal(response.status, 200, body)
      assert.equal(count('glitches'), 1)
      assert.equal(count('echoes'), 1)
      // noinspection SqlNoDataSourceInspection
      const glitch = sqlite.prepare('SELECT * FROM glitches').get()
      // noinspection SqlNoDataSourceInspection
      const echo = sqlite.prepare('SELECT * FROM echoes').get()
      glitchId = glitch.glitch_id
      assert.equal(glitch.status, 'LEAKED')
      assert.equal(glitch.description, 'Magic fading near the tower')
      assert.equal(echo.description, glitch.description)
      assert.equal(echo.glitch_id, glitchId)
      assert.equal(echo.reporting_guardian_id, 'guardian-defender')
      assert.equal(echo.timestamp, glitch.timestamp)
      assert.ok(Date.parse(echo.timestamp) >= before && Date.parse(echo.timestamp) <= Date.now())
      const list = await rpc('getGlitches', undefined, defender)
      assert.match(list.body, /Magic fading near the tower/)
    })

    await t.test('commander can also report echoes', async () => {
      const { response, body } = await rpc('reportEcho', { description: 'Commander report' }, commander)
      assert.equal(response.status, 200, body)
      assert.equal(count('glitches'), 2)
      assert.equal(count('echoes'), 2)
      // noinspection SqlNoDataSourceInspection
      assert.equal(sqlite.prepare('SELECT reporting_guardian_id FROM echoes WHERE description = ?').get('Commander report').reporting_guardian_id, 'guardian-commander')
    })

    await t.test('invalid descriptions are rejected without inserting records', async () => {
      for (const description of ['', '   \n ', 'x'.repeat(2001), null, 42]) {
        await rpc('reportEcho', { description }, defender)
        assert.equal(count('glitches'), 2)
        assert.equal(count('echoes'), 2)
      }
    })

    await t.test('failure inserting an echo rolls back its glitch', async () => {
      // noinspection SqlNoDataSourceInspection
      sqlite.exec("CREATE TRIGGER fail_echo BEFORE INSERT ON echoes BEGIN SELECT RAISE(ABORT, 'Simulated echo failure'); END")
      try {
        await rpc('reportEcho', { description: 'Must roll back' }, defender)
        assert.equal(count('glitches'), 2)
        assert.equal(count('echoes'), 2)
      } finally {
        // noinspection SqlNoDataSourceInspection
        sqlite.exec('DROP TRIGGER fail_echo')
      }
    })

    await t.test('defender cannot change status, including with a forged role', async () => {
      const { body } = await rpc('updateGlitchStatus', { glitchId, status: 'FIXED', role: 'commander' }, defender)
      assert.match(body, /Alleen commanders/)
      // noinspection SqlNoDataSourceInspection
      assert.equal(sqlite.prepare('SELECT status FROM glitches WHERE glitch_id = ?').get(glitchId).status, 'LEAKED')
    })

    await t.test('commander can change valid statuses; invalid status and missing glitch are rejected', async () => {
      for (const status of ['ASSESSING', 'CONTAINING', 'FIXED', 'LEAKED']) {
        const { response, body } = await rpc('updateGlitchStatus', { glitchId, status }, commander)
        assert.equal(response.status, 200, body)
        // noinspection SqlNoDataSourceInspection
        assert.equal(sqlite.prepare('SELECT status FROM glitches WHERE glitch_id = ?').get(glitchId).status, status)
      }
      await rpc('updateGlitchStatus', { glitchId, status: 'INVALID' }, commander)
      // noinspection SqlNoDataSourceInspection
      assert.equal(sqlite.prepare('SELECT status FROM glitches WHERE glitch_id = ?').get(glitchId).status, 'LEAKED')
      const { body } = await rpc('updateGlitchStatus', { glitchId: 'missing', status: 'FIXED' }, commander)
      assert.match(body, /bestaat niet meer/)
      assert.equal(count('echoes'), 2)
    })

    await t.test('overview renders report form for both roles and status controls only for commander', async () => {
      for (const [cookie, canEdit] of [[defender, false], [commander, true]]) {
        const response = await fetch(base, { headers: { cookie } })
        assert.equal(response.status, 200)
        const html = await response.text()
        assert.match(html, /Echo melden/)
        assert.match(html, /Beschrijving inspreken/)
        assert.match(html, /Guardian van Achrona/)
        assert.match(html, /Vraag Auri/)
        assert.match(html, /Magic fading near the tower/)
        assert.equal(html.includes('Status wijzigen voor'), canEdit)
      }
    })

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRZkAAAAASUVORK5CYII=', 'base64')
    function upload(description, file) {
      const data = new FormData()
      data.set('description', description)
      if (file !== undefined) data.set('image', file, ...(file instanceof Blob ? ['photo.png'] : []))
      return data
    }

    await t.test('multipart submission without an image remains supported', async () => {
      const { response, body } = await rpc('reportEcho', upload('No photo needed'), defender)
      assert.equal(response.status, 200, body)
      assert.equal(count('echoes'), 3)
      assert.equal(count('echo_images'), 0)
    })

    await t.test('uploaded image is linked, listed, and served only to logged-in guardians', async () => {
      const { response, body } = await rpc('reportEcho', upload('Photo evidence', new Blob([png], { type: 'image/png' })), defender)
      assert.equal(response.status, 200, body)
      assert.equal(count('echo_images'), 1)
      // noinspection SqlNoDataSourceInspection
      const echo = sqlite.prepare('SELECT * FROM echoes WHERE description = ?').get('Photo evidence')
      // noinspection SqlNoDataSourceInspection
      const image = sqlite.prepare('SELECT * FROM echo_images WHERE echo_id = ?').get(echo.echo_id)
      assert.deepEqual(image.data, png)
      assert.equal(image.content_type, 'image/png')
      const imageUrl = `${base}/echo-images/${echo.echo_id}`
      assert.equal((await fetch(imageUrl)).status, 401)
      for (const cookie of [defender, commander]) {
        const response = await fetch(imageUrl, { headers: { cookie } })
        assert.equal(response.status, 200)
        assert.equal(response.headers.get('content-type'), 'image/png')
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
        assert.match(response.headers.get('cache-control'), /no-store/)
        assert.deepEqual(Buffer.from(await response.arrayBuffer()), png)
      }
      assert.equal((await fetch(`${base}/echo-images/missing`, { headers: { cookie: defender } })).status, 404)
      const list = await rpc('getGlitches', undefined, defender)
      assert.match(list.body, new RegExp(echo.echo_id))
      assert.ok(!list.body.includes(png.toString('base64')))
      const page = await (await fetch(base, { headers: { cookie: defender } })).text()
      assert.match(page, new RegExp(`/echo-images/${echo.echo_id}`))
      assert.match(page, /optioneel/)
    })

    await t.test('invalid, oversized, empty and disguised files cannot create records', async () => {
      const before = count('echoes')
      for (const file of [
        new Blob(['<svg onload="alert(1)"/>'], { type: 'image/svg+xml' }),
        new Blob(['not a photo'], { type: 'image/png' }),
        new Blob([png], { type: 'image/jpeg' }),
        new Blob([], { type: 'image/png' }),
        new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/png' }),
        'not-a-file',
      ]) {
        await rpc('reportEcho', upload('Invalid upload', file), defender)
        assert.equal(count('echoes'), before)
        assert.equal(count('glitches'), before)
        assert.equal(count('echo_images'), 1)
      }
    })

    await t.test('failure saving the image rolls back both echo and glitch', async () => {
      const before = count('echoes')
      // noinspection SqlNoDataSourceInspection
      sqlite.exec("CREATE TRIGGER fail_image BEFORE INSERT ON echo_images BEGIN SELECT RAISE(ABORT, 'Simulated image failure'); END")
      try {
        await rpc('reportEcho', upload('Must roll back photo', new Blob([png], { type: 'image/png' })), commander)
        assert.equal(count('echoes'), before)
        assert.equal(count('glitches'), before)
        assert.equal(count('echo_images'), 1)
      } finally {
        // noinspection SqlNoDataSourceInspection
        sqlite.exec('DROP TRIGGER fail_image')
      }
    })

    await t.test('demo seed can reset linked echoes, images and glitches without removing accounts', () => {
      execFileSync(process.execPath, ['src/db/seed.ts'], { env, stdio: 'pipe' })
      assert.equal(count('echoes'), 0)
      assert.equal(count('echo_images'), 0)
      assert.equal(count('glitches'), 4)
      assert.equal(count('guardians'), 2)
    })
  } finally {
    if (server && server.exitCode === null) {
      const exited = once(server, 'exit')
      server.kill('SIGTERM')
      await exited
    }
    sqlite?.close()
    await rm(dir, { recursive: true, force: true })
  }
})
