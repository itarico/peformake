export function loginErrorMessage(code: string | undefined, message: string): string {
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'E-mail ou senha incorretos.'
  }
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.'
  if (code === 'over_request_rate_limit' || /rate limit/i.test(message)) {
    return 'Muitas tentativas. Aguarde alguns minutos.'
  }
  return 'Não foi possível entrar. Verifique a conexão e tente de novo.'
}

export function validateNewPassword(password: string, confirmation: string): string | null {
  if (password.length < 10) return 'Use pelo menos 10 caracteres.'
  if (password !== confirmation) return 'As senhas não são iguais.'
  return null
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}
