import type {
  Attempt,
  AttemptMode,
  AttemptVersion,
  CaptureChange,
  DemoCredentials,
  DemoPreset,
  DemoSession,
  FinalizeOptions,
  InventoryScope,
  OperatorLineView,
  Receipt,
  RecountInput,
  ReviewView,
} from './models'

export interface InventoryApiPort {
  loginDemo(credentials: DemoCredentials): Promise<DemoSession>
  listScopes(): Promise<InventoryScope[]>
  startAttempt(scopeId: string, mode: AttemptMode): Promise<Attempt>
  getOperatorLines(attemptId: string): Promise<OperatorLineView[]>
  saveBatch(attemptId: string, idempotencyKey: string, changes: CaptureChange[]): Promise<void>
  getReview(attemptId: string): Promise<ReviewView>
  finalize(attemptId: string, options?: FinalizeOptions): Promise<AttemptVersion>
  submit(attemptId: string, idempotencyKey: string): Promise<Receipt>
  getHistory(attemptId: string): Promise<AttemptVersion[]>
  createRecount(attemptId: string, input: RecountInput): Promise<Attempt>
  loadPreset(preset: DemoPreset): Promise<void>
  resetDemo(): Promise<void>
  authorizeReplacementKey(idempotencyKey: string): Promise<string>
}
