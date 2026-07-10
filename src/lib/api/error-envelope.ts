import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

/**
 * Consistent API error envelope per 60-backend-api.mdc:
 *   { error: { code, message, details?, requestId } }
 * Every Route Handler under /api/v1/... should throw an ApiError (or catch
 * and wrap) so callers get a stable, machine-parseable shape rather than an
 * ad-hoc message string.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function apiErrorResponse(error: unknown, requestId = randomUUID()) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      { status: error.status },
    );
  }

  // Unknown errors: never leak internals to the client, but do surface the
  // requestId so it can be correlated against server-side Sentry/logs.
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
        requestId,
      },
    },
    { status: 500 },
  );
}
