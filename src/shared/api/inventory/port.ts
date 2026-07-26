import type {
  Attempt,
  AttemptMode,
  CaptureChange,
  DemoCredentials,
  DemoPreset,
  DemoSession,
  InventoryScope,
  OperatorLineView,
} from './models'

export interface InventoryApiPort {
  loginDemo(credentials: DemoCredentials): Promise<DemoSession>
  listScopes(): Promise<InventoryScope[]>
  startAttempt(scopeId: string, mode: AttemptMode): Promise<Attempt>
  getOperatorLines(attemptId: string): Promise<OperatorLineView[]>
  saveBatch(idempotencyKey: string, changes: CaptureChange[]): Promise<void>
  finalize(attemptId: string): Promise<void>
  submit(attemptId: string, idempotencyKey: string): Promise<void>
  loadPreset(preset: DemoPreset): Promise<void>
  resetDemo(): Promise<void>
  authorizeReplacementKey(idempotencyKey: string): Promise<string>
}
