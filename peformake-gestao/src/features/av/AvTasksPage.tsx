import { TeamTasksBoard } from '@/features/tasks/TeamTasksBoard'
import { AvShell } from './AvShell'

/** Audiovisual → Tarefas: o que a equipe tem para fazer. A entrega de cada gravação marcada entra aqui sozinha. */
export function AvTasksPage() {
  return (
    <AvShell title="Tarefas">
      <TeamTasksBoard area="audiovisual" clientArea="audiovisual" />
    </AvShell>
  )
}
