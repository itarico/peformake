import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthState, type AuthUser } from './context'
import { RequireAuth, RequireRole } from './guards'

const baseUser: AuthUser = { id: '1', email: 'a@b.co', fullName: 'A', isActive: true, roles: ['traffic_manager'], realRoles: ['traffic_manager'], viewAs: null }

function renderGuarded(state: AuthState, roles: Parameters<typeof RequireRole>[0]['roles'] = ['traffic_manager']) {
  return render(
    <AuthContext.Provider
      value={{
        state,
        signIn: vi.fn(),
        signOut: vi.fn(),
        requestPasswordReset: vi.fn(),
        updatePassword: vi.fn(),
        retry: vi.fn(),
        setViewAs: vi.fn(),
      }}
    >
      <MemoryRouter initialEntries={['/segredo']}>
        <Routes>
          <Route path="/login" element={<p>tela de login</p>} />
          <Route element={<RequireAuth />}>
            <Route element={<RequireRole roles={roles} />}>
              <Route path="/segredo" element={<p>conteúdo protegido</p>} />
            </Route>
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('proteção de rotas', () => {
  it('libera quem está ativo e tem o cargo', () => {
    renderGuarded({ status: 'ready', user: baseUser })
    expect(screen.getByText('conteúdo protegido')).toBeInTheDocument()
  })

  it('manda para o login quem não entrou', () => {
    renderGuarded({ status: 'signed_out' })
    expect(screen.getByText('tela de login')).toBeInTheDocument()
  })

  it.each<[string, AuthState]>([
    ['carregando', { status: 'loading' }],
    ['erro ao confirmar acesso', { status: 'error' }],
    ['conta inativa', { status: 'ready', user: { ...baseUser, isActive: false } }],
    ['cargo errado', { status: 'ready', user: { ...baseUser, roles: ['designer'] } }],
    ['sem cargo', { status: 'ready', user: { ...baseUser, roles: [] } }],
  ])('bloqueia: %s', (_name, state) => {
    renderGuarded(state)
    expect(screen.queryByText('conteúdo protegido')).not.toBeInTheDocument()
  })
})
