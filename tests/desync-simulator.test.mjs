import assert from 'node:assert/strict'
import test from 'node:test'
import { SIMULATION_INCIDENTS, isSimulatedGlitch, newSimulatedGlitchId, pickSimulationIncident } from '../src/lib/desync-simulator.ts'
import { ACHRONA_BUILDINGS, isBuildingId } from '../src/lib/achrona-map.ts'

test('simulated glitch ids are recognisable and unique', () => {
  const ids = new Set(Array.from({ length: 200 }, () => newSimulatedGlitchId()))
  assert.equal(ids.size, 200)
  for (const id of ids) {
    assert.match(id, /^SIM-[0-9A-F]{8}$/)
    assert.ok(isSimulatedGlitch(id))
  }
})

test('real glitch ids are never treated as simulated', () => {
  for (const id of ['GL-0142', 'GL-SIM-1', 'sim-1234', '', 'XSIM-12345678']) {
    assert.equal(isSimulatedGlitch(id), false, id)
  }
})

test('every incident sits in a real building, and a wave can reach every building', () => {
  assert.ok(SIMULATION_INCIDENTS.length >= 6)
  for (const incident of SIMULATION_INCIDENTS) assert.ok(isBuildingId(incident.buildingId), incident.buildingId)
  const covered = new Set(SIMULATION_INCIDENTS.map((incident) => incident.buildingId))
  assert.deepEqual([...covered].sort(), ACHRONA_BUILDINGS.map(({ id }) => id).sort())
})

test('incidents avoid descriptions already in use', () => {
  const used = new Set(SIMULATION_INCIDENTS.slice(0, -1).map((incident) => incident.description))
  assert.deepEqual(pickSimulationIncident(used), SIMULATION_INCIDENTS.at(-1))
})

test('an incident is still returned once every one is in use', () => {
  const incident = pickSimulationIncident(new Set(SIMULATION_INCIDENTS.map((item) => item.description)))
  assert.ok(SIMULATION_INCIDENTS.includes(incident))
})
