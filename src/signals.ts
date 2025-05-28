import { flushWork, queue } from "./microtaskBatcher";

let batchDepth = 0;
export function batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushWork();
    }
  }
}

/* ---------- core types ---------- */
type Subscriber = (() => void) & { deps?: Set<Signal<any>> };
let active: Subscriber | null = null;

type CleanupFn = () => void;

/* ---------- Signal ---------- */
export class Signal<T> {
  private subs = new Set<Subscriber>();
  private _version = 0;
  constructor(private _v: T) {}

  /** reactive getter */
  get value(): T {
    if (active) {
      this.subs.add(active);
      (active.deps ||= new Set()).add(this); // track reverse edge
    }
    return this._v;
  }
  /** reactive setter */
  set value(v: T) {
    if (Object.is(v, this._v)) return;
    this._v = v;
    this._version++;
    this.subs.forEach((fn) => queue.add(fn));
    if (batchDepth === 0) flushWork(); // Only auto-flush if not batching
  }

  /** @internal */
  subscribe(fn: Subscriber): CleanupFn {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }
  /** @internal */
  detach(sub: Subscriber) {
    this.subs.delete(sub);
  }
  dispose() {
    this.subs.forEach((sub) => sub.deps?.delete(this));
    this.subs.clear();
  }
}

/**
 * Type utility for readonly signals (compile time).
 */

declare const _readonlySignalBrand: unique symbol;
export type ReadonlySignal<T> = {
  readonly value: T;
  subscribe(fn: Subscriber): CleanupFn;
  readonly [_readonlySignalBrand]: void;
};

let effectDepth = 0;
const MAX_EFFECT_DEPTH = 100;

/* ---------- effect (auto-tracked) ---------- */
export function effect(fn: () => void): CleanupFn {
  const runner: Subscriber = () => {
    if (++effectDepth > MAX_EFFECT_DEPTH) {
      effectDepth--;
      throw new Error("Effect depth exceeded—likely infinite loop");
    }
    try {
      // unsubscribe from previous deps
      runner.deps?.forEach((s) => s.detach(runner));
      runner.deps = new Set();

      const prev = active;
      active = runner;
      try {
        fn();
      } catch (err) {
        console.error("Effect error:", err);
      } finally {
        active = prev;
      }
    } finally {
      effectDepth--;
    }
  };

  runner();
  return () => {
    runner.deps?.forEach((s) => s.detach(runner));
    runner.deps = undefined;
  };
}

/* ---------- computed (readonly, frozen at runtime) ---------- */

function untrack<T>(fn: () => T): T {
  const prev = active;
  active = null;
  try {
    return fn();
  } finally {
    active = prev;
  }
}

export function computed<T>(fn: () => T): ReadonlySignal<T> {
  let computing = false;
  const out = new Signal<T>(untrack(fn)); // initialize with first value!
  effect(() => {
    if (computing) throw new Error("Cycle detected in computed!");
    computing = true;
    try {
      out.value = fn();
    } finally {
      computing = false;
    }
  });
  const readonly = {
    get value() {
      return out.value;
    },
    subscribe(fn: Subscriber) {
      return out.subscribe(fn);
    },
    [_readonlySignalBrand]: undefined,
  };
  return Object.freeze(readonly) as ReadonlySignal<T>;
}
