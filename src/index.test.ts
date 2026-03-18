import { describe, it, before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { BreathKit, Patterns, createPattern, type Phase } from "./index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Advance the real clock by ticking the kit's internal interval manually */
function advanceTicks(kit: BreathKit, count: number): void {
  // Access private _tick via bracket notation for testing purposes
  for (let i = 0; i < count; i++) {
    (kit as any)._tick();
  }
}

// ─── createPattern ────────────────────────────────────────────────────────────

describe("createPattern()", () => {
  it("returns a valid pattern unchanged", () => {
    const p = createPattern({
      id: "test",
      name: "Test",
      description: "A test pattern",
      phases: [{ name: "inhale", label: "In", duration: 4 }],
    });
    assert.equal(p.id, "test");
    assert.equal(p.phases.length, 1);
  });

  it("throws when id is missing", () => {
    assert.throws(() =>
      createPattern({ id: "", name: "X", description: "", phases: [{ name: "inhale", label: "In", duration: 4 }] }),
      /requires at least/
    );
  });

  it("throws when phases array is empty", () => {
    assert.throws(() =>
      createPattern({ id: "x", name: "X", description: "", phases: [] }),
      /requires at least/
    );
  });

  it("throws when a phase duration is 0 or negative", () => {
    assert.throws(() =>
      createPattern({
        id: "x", name: "X", description: "",
        phases: [{ name: "inhale", label: "In", duration: 0 }],
      }),
      /greater than 0/
    );
  });
});

// ─── Built-in Patterns ────────────────────────────────────────────────────────

describe("Patterns", () => {
  it("Patterns.coherenceCardiaque has 2 phases of 5s each", () => {
    const p = Patterns.coherenceCardiaque;
    assert.equal(p.phases.length, 2);
    assert.equal(p.phases[0].duration, 5);
    assert.equal(p.phases[1].duration, 5);
  });

  it("Patterns.fourSevenEight sums to 19s per cycle", () => {
    const total = Patterns.fourSevenEight.phases.reduce((acc, p) => acc + p.duration, 0);
    assert.equal(total, 19);
  });

  it("Patterns.boxBreathing has 4 equal phases of 4s", () => {
    const p = Patterns.boxBreathing;
    assert.equal(p.phases.length, 4);
    assert.ok(p.phases.every((ph) => ph.duration === 4));
  });
});

// ─── BreathKit — State Machine ────────────────────────────────────────────────

describe("BreathKit state machine", () => {
  it("starts in idle state", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    assert.equal(kit.state, "idle");
  });

  it("transitions to running on start()", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    assert.equal(kit.state, "running");
    kit.stop();
  });

  it("transitions to paused on pause()", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    kit.pause();
    assert.equal(kit.state, "paused");
    kit.stop();
  });

  it("transitions back to running on resume()", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    kit.pause();
    kit.resume();
    assert.equal(kit.state, "running");
    kit.stop();
  });

  it("transitions to idle on stop()", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    kit.stop();
    assert.equal(kit.state, "idle");
  });

  it("calling pause() when idle has no effect", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.pause();
    assert.equal(kit.state, "idle");
  });

  it("calling resume() when running has no effect", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    kit.resume(); // already running
    assert.equal(kit.state, "running");
    kit.stop();
  });

  it("resets correctly after stop()", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    advanceTicks(kit, 3);
    kit.stop();
    assert.equal(kit.state, "idle");
    assert.equal(kit.currentCycle, 1);
    assert.equal(kit.currentPhaseIndex, 0);
    assert.equal(kit.secondsRemaining, 0);
  });
});

// ─── BreathKit — Phase Progression ───────────────────────────────────────────

describe("BreathKit phase progression", () => {
  it("fires onPhaseChange on start", () => {
    const phases: Phase[] = [];
    const kit = new BreathKit({
      pattern: Patterns.coherenceCardiaque,
      onPhaseChange: (phase) => phases.push(phase),
    });
    kit.start();
    kit.stop();
    assert.equal(phases.length, 1);
    assert.equal(phases[0].name, "inhale");
  });

  it("advances to next phase after the correct number of ticks", () => {
    const phaseNames: string[] = [];
    const kit = new BreathKit({
      pattern: Patterns.coherenceCardiaque, // 5s inhale, 5s exhale
      onPhaseChange: (phase) => phaseNames.push(phase.name),
    });
    kit.start();
    // After 5 ticks (seconds 4→0), phase should advance
    advanceTicks(kit, 5);
    assert.equal(phaseNames[1], "exhale");
    kit.stop();
  });

  it("calls onTick with correct secondsRemaining", () => {
    const ticks: number[] = [];
    const kit = new BreathKit({
      pattern: createPattern({
        id: "t", name: "T", description: "",
        phases: [{ name: "inhale", label: "In", duration: 3 }],
      }),
      cycles: 1,
      onTick: (s) => ticks.push(s),
    });
    kit.start();
    advanceTicks(kit, 2);
    // Initial onTick(3), then tick→2, tick→1
    assert.deepEqual(ticks, [3, 2, 1]);
    kit.stop();
  });

  it("calls onCycleComplete at the end of a cycle", () => {
    let completedCycles = 0;
    const kit = new BreathKit({
      pattern: createPattern({
        id: "t", name: "T", description: "",
        phases: [{ name: "inhale", label: "In", duration: 1 }],
      }),
      cycles: 3,
      onCycleComplete: () => completedCycles++,
    });
    kit.start();
    advanceTicks(kit, 1); // exhaust 1s phase → cycle 1 complete
    assert.equal(completedCycles, 1);
    kit.stop();
  });
});

// ─── BreathKit — Cycles ───────────────────────────────────────────────────────

describe("BreathKit cycles", () => {
  it("reaches completed state after all cycles", () => {
    let completed = false;
    const kit = new BreathKit({
      pattern: createPattern({
        id: "t", name: "T", description: "",
        phases: [{ name: "inhale", label: "In", duration: 1 }],
      }),
      cycles: 2,
      onComplete: () => { completed = true; },
    });
    kit.start();
    advanceTicks(kit, 1); // cycle 1 done
    advanceTicks(kit, 1); // cycle 2 done → completed
    assert.equal(kit.state, "completed");
    assert.ok(completed);
  });

  it("does not call onComplete when cycles is 0 (infinite)", () => {
    let completed = false;
    const kit = new BreathKit({
      pattern: createPattern({
        id: "t", name: "T", description: "",
        phases: [{ name: "inhale", label: "In", duration: 1 }],
      }),
      cycles: 0,
      onComplete: () => { completed = true; },
    });
    kit.start();
    // Run many cycles
    for (let i = 0; i < 20; i++) advanceTicks(kit, 1);
    assert.equal(kit.state, "running");
    assert.ok(!completed);
    kit.stop();
  });

  it("increments currentCycle correctly", () => {
    const kit = new BreathKit({
      pattern: createPattern({
        id: "t", name: "T", description: "",
        phases: [{ name: "inhale", label: "In", duration: 1 }],
      }),
      cycles: 5,
    });
    kit.start();
    assert.equal(kit.currentCycle, 1);
    advanceTicks(kit, 1);
    assert.equal(kit.currentCycle, 2);
    advanceTicks(kit, 1);
    assert.equal(kit.currentCycle, 3);
    kit.stop();
  });
});

// ─── BreathKit — Getters ──────────────────────────────────────────────────────

describe("BreathKit getters", () => {
  it("currentPhase reflects the active phase", () => {
    const kit = new BreathKit({ pattern: Patterns.boxBreathing });
    kit.start();
    assert.equal(kit.currentPhase.name, "inhale");
    kit.stop();
  });

  it("secondsRemaining decrements with ticks", () => {
    const kit = new BreathKit({
      pattern: createPattern({
        id: "t", name: "T", description: "",
        phases: [{ name: "inhale", label: "In", duration: 5 }],
      }),
    });
    kit.start();
    assert.equal(kit.secondsRemaining, 5);
    advanceTicks(kit, 2);
    assert.equal(kit.secondsRemaining, 3);
    kit.stop();
  });
});
