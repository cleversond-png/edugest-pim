/**
 * timer.ts — Utilities for measuring execution time
 */

export function startTimer() {
  const start = Date.now()
  return () => Date.now() - start
}

export function getTimeMs(startTime: number): number {
  return Date.now() - startTime
}
