import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InfiniteSlider } from '@/components/ui/infinite-slider';

const ClientLogosSection = () => {
  // Este componente já é carregado sob demanda (code-split) pela página,
  // então buscamos os dados assim que ele monta — sem depender de um
  // segundo gatilho de "entrou na tela", que podia travar a seção
  // permanentemente no esqueleto de carregamento se não disparasse.
  const { data: allClients, isLoading, isError } = useQuery({
    queryKey: ['landing-all-client-logos'],
    queryFn: async () => {
      const { data: activeClients } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .eq('show_on_site', true)
        .order('name');

      const { data: portfolioCases } = await supabase
        .from('portfolio_cases')
        .select('id, client_name, logo_url')
        .eq('is_active', true)
        .order('display_order');

      const clientMap = new Map<string, { id: string; name: string; logo_url: string | null }>();

      (activeClients || []).forEach(c => {
        if (!c.name) return;
        clientMap.set(c.name.toLowerCase(), { id: c.id, name: c.name, logo_url: c.logo_url });
      });

      (portfolioCases || []).forEach(c => {
        if (!c.client_name) return;
        const key = c.client_name.toLowerCase();
        if (!clientMap.has(key)) {
          clientMap.set(key, { id: c.id, name: c.client_name, logo_url: c.logo_url });
        } else if (!clientMap.get(key)!.logo_url && c.logo_url) {
          clientMap.get(key)!.logo_url = c.logo_url;
        }
      });

      return Array.from(clientMap.values());
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  if (isError) {
    console.error('ClientLogosSection: falha ao carregar clientes do Supabase');
  }

  const clients = allClients || [];

  // Nada pra mostrar (e não é mais loading) -> some com a seção
  // em vez de ficar presa num esqueleto de carregamento pra sempre.
  if (!isLoading && (isError || clients.length === 0)) {
    return null;
  }

  return (
    <section className="border-t border-border bg-card py-16 md:py-24 overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 mb-10 md:mb-14">
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Nossos clientes</span>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            Empresas que confiam na Peformake
          </h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Clientes ativos e parceiros que já passaram pela nossa agência.
          </p>
        </div>
      </div>

      <div className="w-full">
        {clients.length > 0 ? (
          <InfiniteSlider gap={24} duration={30} durationOnHover={60}>
            {clients.map((client) => (
              <div key={client.id} className="flex-shrink-0 flex flex-col items-center gap-2 w-24">
                <div className="w-20 h-20 rounded-full border-2 border-border bg-background overflow-hidden flex items-center justify-center p-1">
                  {client.logo_url ? (
                    <img
                      src={client.logo_url}
                      alt={client.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-2xl font-black text-muted-foreground/50">
                      {client.name.charAt(0)}
                    </span>
                  )}
                </div>
                <p className="truncate text-center text-[10px] font-medium text-muted-foreground w-full">
                  {client.name}
                </p>
              </div>
            ))}
          </InfiniteSlider>
        ) : (
          <div className="flex justify-center gap-4 px-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-40 rounded-2xl border border-border bg-background p-4">
                <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted/40 p-4">
                  <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
                </div>
                <p className="mt-3 text-center text-xs text-muted-foreground">Carregando</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ClientLogosSection;
