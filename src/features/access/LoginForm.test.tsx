import i18n from 'i18next'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initReactI18next } from 'react-i18next'

vi.mock('idb-keyval', () => {
  const store = new Map<string, unknown>()
  return {
    createStore: vi.fn(() => ({})),
    get: vi.fn((key: string) => Promise.resolve(store.get(key))),
    set: vi.fn((key: string, value: unknown) => {
      store.set(key, value)
      return Promise.resolve()
    }),
    del: vi.fn((key: string) => {
      store.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      store.clear()
      return Promise.resolve()
    }),
  }
})

import { clear } from 'idb-keyval'
import { LoginForm } from './LoginForm'
import { SessionProvider, useSession } from './SessionContext'

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      translation: {
        access: {
          title: 'Iniciar sesión',
          username: 'Usuario',
          password: 'Contraseña',
          submit: 'Entrar',
          usernameRequired: 'El usuario es obligatorio',
          passwordRequired: 'La contraseña es obligatoria',
          invalid: 'Credenciales inválidas. Verifique el usuario y la contraseña.',
        },
      },
    },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

function Probe() {
  const { session } = useSession()
  return <div data-testid="role">{session?.role ?? 'anonymous'}</div>
}

function renderForm() {
  return render(
    <SessionProvider>
      <LoginForm />
      <Probe />
    </SessionProvider>,
  )
}

async function fillAndSubmit(username: string, password: string) {
  const user = userEvent.setup()
  await user.click(screen.getByLabelText('Usuario'))
  await user.keyboard(username)
  await user.click(screen.getByLabelText('Contraseña'))
  await user.keyboard(password + '{Enter}')
}

describe('LoginForm', () => {
  beforeEach(async () => {
    await clear()
  })

  it('blocks empty submit with inline required errors and no session', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('El usuario es obligatorio')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('El usuario es obligatorio')).toBeVisible()
      expect(screen.getByText('La contraseña es obligatoria')).toBeVisible()
    })
    expect(screen.getByTestId('role')).toHaveTextContent('anonymous')
  })

  it('keeps invalid credentials on /login with an accessible Spanish error', async () => {
    renderForm()

    await fillAndSubmit('desconocido', 'xxxx')

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales inválidas')
    expect(screen.getByTestId('role')).toHaveTextContent('anonymous')
  })

  it.each([
    ['operador', 'operador', 'operator'],
    ['lider', 'lider', 'cost-leader'],
    ['admin', 'admin', 'demo-admin'],
  ])('starts a %s session via keyboard submit', async (username, password, role) => {
    renderForm()

    await fillAndSubmit(username, password)

    await waitFor(() => {
      expect(screen.getByTestId('role')).toHaveTextContent(role)
    })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
