import { ConsoleTransport } from "loglayer"
import { buildCreateLogger, buildRootLogger } from "./build"
import type { LogLevel } from "./log-level"

const isDev =
  typeof process !== "undefined" && process.env?.NODE_ENV !== "production"

const level: LogLevel = isDev ? "debug" : "warn"

const root = buildRootLogger({
  transport: new ConsoleTransport({ logger: console }),
  level,
})

export const logger = root
export const createLogger = buildCreateLogger(root)
