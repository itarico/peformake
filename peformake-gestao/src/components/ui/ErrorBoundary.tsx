import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

/** Protege a página: um dado fora do formato mostra "Tentar de novo" em vez de deixar a tela branca. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Erro na tela', error, info.componentStack) }
  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null })
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-3xl border border-line bg-surface px-6 py-10 text-center">
        <p className="text-[17px] font-semibold">Esta tela não abriu direito</p>
        <p className="text-[13px] text-muted">Um dado veio diferente do esperado. O resto do sistema continua funcionando.</p>
        <button type="button" onClick={() => this.setState({ error: null })}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-fill px-5 font-semibold text-on-fill">
          <RefreshCw size={15} aria-hidden="true" /> Tentar de novo
        </button>
      </div>
    )
  }
}
