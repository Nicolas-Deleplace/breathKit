// BreathKit — Zero-dependency TypeScript library for guided breathing exercises
// MIT License

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Phase {
  /** Internal identifier for the phase */
  name: string;
  /** Human-readable label shown to the user */
  label: string;
  /** Duration of this phase in seconds */
  duration: number;
}

export interface Pattern {
  id: string;
  name: string;
  description: string;
  phases: Phase[];
}

export type BreathKitState = "idle" | "running" | "paused" | "completed";

export interface BreathKitOptions {
  /** The breathing pattern to follow */
  pattern: Pattern;
  /**
   * Number of full cycles to run.
   * If undefined or 0, runs indefinitely until stop() is called.
   */
  cycles?: number;
  /** Called each time a phase changes */
  onPhaseChange?: (phase: Phase, phaseIndex: number, cycleNumber: number) => void;
  /** Called each second with the remaining time in the current phase */
  onTick?: (secondsRemaining: number, phase: Phase, cycleNumber: number) => void;
  /** Called when a full cycle is completed */
  onCycleComplete?: (cycleNumber: number) => void;
  /** Called when all cycles are done (only if cycles is set) */
  onComplete?: () => void;
}

// ─── Built-in Patterns ────────────────────────────────────────────────────────

export const Patterns = {
  /** Cohérence cardiaque: 5s inhale / 5s exhale — 6 cycles/min */
  coherenceCardiaque: {
    id: "coherence-cardiaque",
    name: "Cohérence cardiaque",
    description: "5s inspirez / 5s expirez — idéal pour la régulation émotionnelle",
    phases: [
      { name: "inhale", label: "Inspirez", duration: 5 },
      { name: "exhale", label: "Expirez", duration: 5 },
    ],
  } as Pattern,

  /** 4-7-8: 4s inhale / 7s hold / 8s exhale — anti-stress & sleep */
  fourSevenEight: {
    id: "4-7-8",
    name: "4-7-8",
    description: "4s inspirez / 7s retenez / 8s expirez — anti-stress et sommeil",
    phases: [
      { name: "inhale", label: "Inspirez", duration: 4 },
      { name: "hold", label: "Retenez", duration: 7 },
      { name: "exhale", label: "Expirez", duration: 8 },
    ],
  } as Pattern,

  /** Box Breathing: 4-4-4-4 — focus & stress management */
  boxBreathing: {
    id: "box-breathing",
    name: "Box Breathing",
    description: "4s inspirez / 4s retenez / 4s expirez / 4s retenez — focus et calme",
    phases: [
      { name: "inhale", label: "Inspirez", duration: 4 },
      { name: "hold", label: "Retenez", duration: 4 },
      { name: "exhale", label: "Expirez", duration: 4 },
      { name: "hold-after-exhale", label: "Retenez", duration: 4 },
    ],
  } as Pattern,
} as const;

// ─── BreathKit Class ──────────────────────────────────────────────────────────

export class BreathKit {
  private options: Required<BreathKitOptions>;
  private _state: BreathKitState = "idle";
  private _currentPhaseIndex = 0;
  private _currentCycle = 1;
  private _secondsRemaining = 0;
  private _intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: BreathKitOptions) {
    this.options = {
      cycles: 0,
      onPhaseChange: () => {},
      onTick: () => {},
      onCycleComplete: () => {},
      onComplete: () => {},
      ...options,
    };
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Current state of the session */
  get state(): BreathKitState {
    return this._state;
  }

  /** Current phase index within the pattern */
  get currentPhaseIndex(): number {
    return this._currentPhaseIndex;
  }

  /** Current cycle number (1-based) */
  get currentCycle(): number {
    return this._currentCycle;
  }

  /** Seconds remaining in the current phase */
  get secondsRemaining(): number {
    return this._secondsRemaining;
  }

  /** The current phase object */
  get currentPhase(): Phase {
    return this.options.pattern.phases[this._currentPhaseIndex];
  }

  /** Start the breathing session */
  start(): void {
    if (this._state === "running") return;
    this._state = "running";
    this._currentPhaseIndex = 0;
    this._currentCycle = 1;
    this._beginPhase();
  }

  /** Pause the session (preserves current phase + time) */
  pause(): void {
    if (this._state !== "running") return;
    this._state = "paused";
    this._clearInterval();
  }

  /** Resume after a pause */
  resume(): void {
    if (this._state !== "paused") return;
    this._state = "running";
    this._tick();
  }

  /** Stop and reset the session */
  stop(): void {
    this._clearInterval();
    this._state = "idle";
    this._currentPhaseIndex = 0;
    this._currentCycle = 1;
    this._secondsRemaining = 0;
  }

  // ─── Private Methods ─────────────────────────────────────────────────────────

  private _beginPhase(): void {
    const phase = this.currentPhase;
    this._secondsRemaining = phase.duration;
    this.options.onPhaseChange(phase, this._currentPhaseIndex, this._currentCycle);
    this.options.onTick(this._secondsRemaining, phase, this._currentCycle);
    this._scheduleInterval();
  }

  private _scheduleInterval(): void {
    this._clearInterval();
    this._intervalId = setInterval(() => this._tick(), 1000);
  }

  private _tick(): void {
    this._secondsRemaining -= 1;

    if (this._secondsRemaining > 0) {
      this.options.onTick(this._secondsRemaining, this.currentPhase, this._currentCycle);
      return;
    }

    // Phase is over — move to next phase or next cycle
    this._clearInterval();
    this._advancePhase();
  }

  private _advancePhase(): void {
    const { pattern, cycles } = this.options;
    const nextPhaseIndex = this._currentPhaseIndex + 1;

    if (nextPhaseIndex < pattern.phases.length) {
      // Move to next phase within the same cycle
      this._currentPhaseIndex = nextPhaseIndex;
      this._beginPhase();
    } else {
      // Cycle complete
      this.options.onCycleComplete(this._currentCycle);

      const isLastCycle = cycles !== 0 && this._currentCycle >= cycles;

      if (isLastCycle) {
        this._state = "completed";
        this.options.onComplete();
      } else {
        this._currentCycle += 1;
        this._currentPhaseIndex = 0;
        this._beginPhase();
      }
    }
  }

  private _clearInterval(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }
}

// ─── Factory Helper ───────────────────────────────────────────────────────────

/**
 * Shorthand to create a custom pattern.
 *
 * @example
 * const myPattern = createPattern({
 *   id: 'my-pattern',
 *   name: 'My Pattern',
 *   description: '...',
 *   phases: [
 *     { name: 'inhale', label: 'Breathe in', duration: 4 },
 *     { name: 'exhale', label: 'Breathe out', duration: 6 },
 *   ],
 * });
 */
export function createPattern(pattern: Pattern): Pattern {
  if (!pattern.id || !pattern.name || !pattern.phases?.length) {
    throw new Error("BreathKit: a pattern requires at least id, name, and one phase.");
  }
  if (pattern.phases.some((p) => p.duration <= 0)) {
    throw new Error("BreathKit: all phase durations must be greater than 0.");
  }
  return pattern;
}

export default BreathKit;
