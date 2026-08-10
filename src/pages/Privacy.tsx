export default function Privacy() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      <p className="text-sm text-muted-foreground mb-8">Última atualização: 12 de fevereiro de 2026</p>

      <div className="prose prose-sm dark:prose-invert space-y-6">
        <section>
          <h2 className="text-xl font-semibold">1. Informações que coletamos</h2>
          <p>A Peformake coleta informações necessárias para a prestação de serviços de marketing digital, incluindo:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dados de identificação (nome, e-mail, telefone)</li>
            <li>Dados de contas de anúncios (Meta Ads, Google Ads) para fins de relatórios</li>
            <li>Métricas de campanhas publicitárias (impressões, cliques, conversões, investimento)</li>
            <li>Conteúdo criativo produzido para os clientes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Como usamos as informações</h2>
          <p>Utilizamos os dados coletados para:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Gerenciar e otimizar campanhas de marketing digital</li>
            <li>Gerar relatórios de desempenho para os clientes</li>
            <li>Sincronizar dados de plataformas de anúncios (ex: Meta Ads)</li>
            <li>Melhorar nossos serviços e processos internos</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Compartilhamento de dados</h2>
          <p>Não vendemos ou compartilhamos dados pessoais com terceiros, exceto:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Com plataformas de anúncios necessárias para execução dos serviços</li>
            <li>Quando exigido por lei ou ordem judicial</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Segurança dos dados</h2>
          <p>Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo criptografia, controle de acesso e monitoramento contínuo.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Seus direitos</h2>
          <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento, entrando em contato conosco.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Contato</h2>
          <p>Para dúvidas sobre esta política, entre em contato pelo e-mail da Peformake.</p>
        </section>
      </div>
    </div>
  );
}
