interface TrafficEmptyProps {
  title: string
  text: string
}

/** Estado sem dados. Esta tela nunca mostra números de exemplo. */
export function TrafficEmpty({ title, text }: TrafficEmptyProps) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-prose text-muted">{text}</p>
    </section>
  )
}
