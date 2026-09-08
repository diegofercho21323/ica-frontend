import type { DemoRole, DemoSession } from '../../shared/api/inventory/models'

const demoRoles: readonly DemoRole[] = ['operator', 'cost-leader', 'demo-admin']

const isDemoRole = (value: unknown): value is DemoRole =>
  typeof value === 'string' && demoRoles.includes(value as DemoRole)

export function parseDemoSession(value: unknown): DemoSession | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  const { userId, displayName, role } = candidate
  if (typeof userId !== 'string' || userId.length === 0) return null
  if (typeof displayName !== 'string' || displayName.length === 0) return null
  if (!isDemoRole(role)) return null
  return { userId, displayName, role }
}
