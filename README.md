# 🌬 BreathKit

A zero-dependency TypeScript library for guided breathing exercises — box breathing, 4-7-8, cardiac coherence, and custom patterns.

[![npm version](https://img.shields.io/npm/v/breathkit.svg)](https://www.npmjs.com/package/breathkit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**[Live Demo →](https://nicolas-deleplace.github.io/breathKit)**

---

## Features

- **Zero dependencies** — pure TypeScript, works anywhere
- **Built-in patterns** — Cardiac Coherence, 4-7-8, Box Breathing
- **Fully customizable** — define any pattern with any phases and durations
- **Event-driven API** — `onPhaseChange`, `onTick`, `onCycleComplete`, `onComplete`
- **Simple state machine** — `start`, `pause`, `resume`, `stop`

---

## Installation

```bash
npm install breathkit
```

---

## Quick Start

```typescript
import { BreathKit, Patterns } from 'breathkit';

const kit = new BreathKit({
  pattern: Patterns.boxBreathing,
  cycles: 5,
  onPhaseChange: (phase) => {
    console.log(`→ ${phase.label} for ${phase.duration}s`);
  },
  onTick: (secondsRemaining) => {
    console.log(`  ${secondsRemaining}s remaining`);
  },
  onComplete: () => {
    console.log('Session complete!');
  },
});

kit.start();
```

---

## Built-in Patterns

| Pattern | Phases | Best for |
|---|---|---|
| `Patterns.coherenceCardiaque` | 5s inhale / 5s exhale | Emotional regulation |
| `Patterns.fourSevenEight` | 4s inhale / 7s hold / 8s exhale | Stress & sleep |
| `Patterns.boxBreathing` | 4-4-4-4 | Focus & calm |

---

## Custom Patterns

```typescript
import { BreathKit, createPattern } from 'breathkit';

const myPattern = createPattern({
  id: 'my-pattern',
  name: 'My Pattern',
  description: 'A custom breathing pattern',
  phases: [
    { name: 'inhale', label: 'Breathe in',  duration: 4 },
    { name: 'hold',   label: 'Hold',        duration: 4 },
    { name: 'exhale', label: 'Breathe out', duration: 6 },
  ],
});

const kit = new BreathKit({ pattern: myPattern });
kit.start();
```

---

## API

### `new BreathKit(options)`

| Option | Type | Default | Description |
|---|---|---|---|
| `pattern` | `Pattern` | required | The breathing pattern to follow |
| `cycles` | `number` | `0` | Number of cycles (0 = infinite) |
| `onPhaseChange` | `function` | — | Called when a phase starts |
| `onTick` | `function` | — | Called every second |
| `onCycleComplete` | `function` | — | Called at the end of each cycle |
| `onComplete` | `function` | — | Called when all cycles are done |

### Methods

```typescript
kit.start()   // Start the session
kit.pause()   // Pause (preserves state)
kit.resume()  // Resume after pause
kit.stop()    // Stop and reset
```

### Getters

```typescript
kit.state              // 'idle' | 'running' | 'paused' | 'completed'
kit.currentPhase       // Current Phase object
kit.currentPhaseIndex  // Index within the pattern
kit.currentCycle       // Current cycle number (1-based)
kit.secondsRemaining   // Seconds left in current phase
```

---

## Use in a browser (no bundler)

The `demo/` folder shows a complete vanilla JS implementation you can use as a starting point. Just copy the class from `demo/index.html` — no build step needed.

---

## License

MIT
