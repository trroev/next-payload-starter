import { ConsoleTransport } from "loglayer"
import { buildCreateLogger, buildRootLogger } from "./build"
import type { LogLevel } from "./log-level"

const readLevel = (): LogLevel => {
  const raw =
    typeof process === "undefined" ? undefined : process.env?.LOG_LEVEL
  const isProd =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production"
  const fallback: LogLevel = isProd ? "info" : "debug"
  const allowed: ReadonlyArray<string> = [
    "trace",
    "debug",
    "info",
    "warn",
    "error",
    "fatal",
  ]
  return raw && allowed.includes(raw) ? (raw as LogLevel) : fallback
}

const root = buildRootLogger({
  transport: new ConsoleTransport({ logger: console }),
  level: readLevel(),
})

export const logger = root
export const createLogger = buildCreateLogger(root)
