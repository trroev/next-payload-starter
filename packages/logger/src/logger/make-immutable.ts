import type { LogLayer, LogLayerContext } from "loglayer"

/**
 * Wraps a LogLayer instance so `.withContext()` returns a fresh child instead of
 * mutating the receiver. Prevents per-request context from leaking onto a
 * long-lived root logger.
 */
export const makeImmutable = (instance: LogLayer): LogLayer => {
  const wrapped = instance
  wrapped.withContext = (context?: LogLayerContext): LogLayer => {
    const next = instance.child()
    if (context) {
      next.withContext(context)
    }
    return makeImmutable(next)
  }
  return wrapped
}
