export const queue = new Set<() => void>();

const microtask =
  typeof queueMicrotask === "function"
    ? queueMicrotask
    : (fn: () => void) => Promise.resolve().then(fn);

let flushing = false;

// Microtask DOM batch scheduler
export function flushWork(callback?: () => void) {
  if (callback) {
    queue.add(callback);
  }
  if (flushing) return;
  flushing = true;
  microtask(workLoop);
}

function workLoop() {
  while (queue.size) {
    const jobs = Array.from(queue).reverse(); // LIFO
    queue.clear();
    for (const job of jobs) {
      try {
        job();
      } catch (e) {
        console.error("Error in effect:", e);
      }
    }
  }
  flushing = false;
}
