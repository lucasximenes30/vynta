'use client'

/** Never report a successful logout until the server has revoked the session. */
export async function logoutAndRedirect(destination = '/login') {
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' })
    if (!response.ok) throw new Error('Logout failed')
    window.location.replace(destination)
  } catch {
    window.alert('Não foi possível sair com segurança. Verifique sua conexão e tente novamente.')
  }
}
