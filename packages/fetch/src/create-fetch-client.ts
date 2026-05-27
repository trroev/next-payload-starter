import {
  type BetterFetch,
  type BetterFetchOption,
  createFetch,
  type ErrorContext,
  type RetryOptions,
} from "@better-fetch/fetch"
import { env } from "@repo/env/fetch"
import { createLogger } from "@repo/logger"

const log = createLogger({ name: "fetch" })

const DEFAULT_TIMEOUT_MS = 10_000

const DEFAULT_RETRY = {
  type: "linear",
  attempts: 2,
  delay: 500,
} as const satisfies RetryOptions

// `onError` fires for transport failures and non-OK responses alike because the
// configured clients run with `throw: false` — this is the single failure log.
const logFetchError = (context: ErrorContext): void => {
  log
    .withMetadata({
      url: String(context.request.url),
      status: context.response?.status,
      statusText: context.response?.statusText,
    })
    .withError(context.error)
    .error("fetch request failed")
}

/** Build a fresh, independent Better Fetch client with shared defaults applied. */
export const createFetchClient = (
  options: BetterFetchOption = {}
): BetterFetch => {
  const { onError, ...rest } = options
  return createFetch({
    baseURL: env.BASE_URL,
    retry: DEFAULT_RETRY,
    timeout: DEFAULT_TIMEOUT_MS,
    throw: false,
    ...rest,
    onError: (context) => {
      logFetchError(context)
      return onError?.(context)
    },
  })
}

/** The sanctioned, pre-configured fetch client — import this instead of global `fetch`. */
export const fetchClient: BetterFetch = createFetchClient()
