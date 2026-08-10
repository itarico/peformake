export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Termos de Serviço</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: 12 de fevereiro de 2026</p>

      <div className="prose prose-sm dark:prose-invert space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
          <p>Ao utilizar a plataforma Peformake, você concorda com estes Termos de Serviço. Se não concordar, não utilize nossos serviços.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
          <p>A Peformake oferece uma plataforma de gestão de marketing digital que inclui:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gerenciamento de conteúdo e artes para redes sociais</li>
            <li>Consultoria estratégica de marketing</li>
            <li>Sincronização e relatórios de campanhas de tráfego pago</li>
            <li>Portal do cliente para acompanhamento de resultados</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Uso da Plataforma</h2>
          <p>Você se compromete a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fornecer informações precisas e atualizadas</li>
            <li>Não compartilhar credenciais de acesso com terceiros</li>
            <li>Utilizar a plataforma apenas para fins legítimos</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Integrações com Terceiros</h2>
          <p>A plataforma se integra com serviços como Meta Ads para sincronização de dados de campanhas. Ao autorizar essas integrações, você concorda com os termos dessas plataformas e autoriza a Peformake a acessar os dados necessários para a prestação dos serviços.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Propriedade Intelectual</h2>
          <p>Todo conteúdo criativo produzido pela Peformake permanece sob propriedade da agência até que seja entregue e aprovado pelo cliente, momento em que os direitos de uso são transferidos.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Limitação de Responsabilidade</h2>
          <p>A Peformake não se responsabiliza por resultados específicos de campanhas, alterações nas políticas de plataformas de terceiros, ou indisponibilidade temporária dos serviços.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Contato</h2>
          <p>Para dúvidas sobre estes termos, entre em contato pelo e-mail da Peformake.</p>
        </section>
      </div>
    </div>
  );
}
