/**
 * Minimal structured JSON logger. One JSON object per line to stdout (info/
 * debug) or stderr (warn/error), which is what Cloud Run / container log
 * scrapers and Sentry's log integration expect — see
 * 62-deployment-observability.mdc. Writing directly to the process streams
 * (not `console`) keeps output machine-parseable and sidesteps the
 * `no-console` lint rule.
 *
 * A correlation/request id is threaded through by binding it once with
 * `logger.child({ requestId })` at the edge (route handler / server action)
 * and passing that child down, so every line for one request shares an id.
 *
 * Never log personal information (POPIA — see 10-security-popia.mdc). Field
 * values are the caller's responsibility; this module does not inspect them.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

const INFO_WEIGHT = 20;

// A Map (not an indexed object) so dynamic level lookups aren't flagged as an
// object-injection sink and unknown keys resolve to `undefined`, not a value.
const LEVEL_WEIGHT = new Map<LogLevel, number>([
  ["debug", 10],
  ["info", INFO_WEIGHT],
  ["warn", 30],
  ["error", 40],
]);

function activeThreshold(): number {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return LEVEL_WEIGHT.get(configured as LogLevel) ?? INFO_WEIGHT;
}

function emit(level: LogLevel, message: string, fields: LogFields): void {
  if ((LEVEL_WEIGHT.get(level) ?? INFO_WEIGHT) < activeThreshold()) return;
  const line = `${JSON.stringify({ level, time: new Date().toISOString(), message, ...fields })}\n`;
  if (level === "warn" || level === "error") {
    process.stderr.write(line);
  } else {
    process.stdout.write(line);
  }
}

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Returns a logger that merges `bindings` into every subsequent line. */
  child(bindings: LogFields): Logger;
}

export function createLogger(bindings: LogFields = {}): Logger {
  return {
    debug: (message, fields) => emit("debug", message, { ...bindings, ...fields }),
    info: (message, fields) => emit("info", message, { ...bindings, ...fields }),
    warn: (message, fields) => emit("warn", message, { ...bindings, ...fields }),
    error: (message, fields) => emit("error", message, { ...bindings, ...fields }),
    child: (childBindings) => createLogger({ ...bindings, ...childBindings }),
  };
}

/** Process-wide root logger. Prefer a `child({ requestId })` per request. */
export const logger = createLogger();
