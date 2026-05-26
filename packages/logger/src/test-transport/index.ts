import {
  BaseTransport,
  type LogLayerTransportParams,
} from "@loglayer/transport"
import type { LogLevelType } from "loglayer"

export type CapturedLog = {
  readonly level: LogLevelType
  readonly messages: ReadonlyArray<unknown>
  readonly data?: Record<string, unknown>
}

export class TestCaptureTransport extends BaseTransport<Console> {
  readonly entries: Array<CapturedLog> = []

  constructor() {
    super({ id: "test-capture", logger: console })
  }

  shipToLogger({
    logLevel,
    messages,
    data,
    hasData,
  }: LogLayerTransportParams): Array<unknown> {
    this.entries.push({
      level: logLevel,
      messages: [...messages],
      data: hasData ? (data as Record<string, unknown>) : undefined,
    })
    return [...messages]
  }

  reset(): void {
    this.entries.length = 0
  }
}
