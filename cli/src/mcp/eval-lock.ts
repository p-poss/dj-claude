// Simple promise-chain lock to serialize concurrent evaluations.
// Wraps the entire read-layers → generate → evaluate → update-state
// sequence so jam calls from multiple agents don't interleave.

let chain = Promise.resolve();

export function withEvalLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.then(
    () => {},
    () => {},
  );
  return next;
}
