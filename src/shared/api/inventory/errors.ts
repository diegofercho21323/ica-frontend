export type HttpStatus = 400 | 403 | 404 | 409 | 422

// Error codes mirror PRD appendix A. Exact server strings are still an open
// question in `design.md`; these names are the mock contract until confirmed.
export type ErrorCode =
  | 'SCOPE_NOT_FOUND'
  | 'ATTEMPT_NOT_FOUND'
  | 'PENDING_LINES_EXIST'
  | 'ATTEMPT_NOT_LOCKED'
  | 'ATTEMPT_LOCKED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'SUBMISSION_NOT_FOUND'
  | 'EMPTY_RECOUNT_SELECTION'
  | 'FORBIDDEN'

export class HttpError extends Error {
  readonly status: HttpStatus
  readonly code: ErrorCode

  constructor(status: HttpStatus, code: ErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}
