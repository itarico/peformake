import { useEffect, useRef, useState, type FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { InfiniteSlider } from '@/components/ui/infinite-slider';

const ClientLogosSection = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [shouldLoad]);

  const { data: allClients } = useQuery({
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
        clientMap.set(c.name.toLowerCase(), { id: c.id, name: c.name, logo_url: c.logo_url });
      });

      (portfolioCases || []).forEach(c => {
        const key = c.client_name.toLowerCase();
        if (!clientMap.has(key)) {
          clientMap.set(key, { id: c.id, name: c.client_name, logo_url: c.logo_url });
        } else if (!clientMap.get(key)!.logo_url && c.logo_url) {
          clientMap.get(key)!.logo_url = c.logo_url;
        }
      });

      return Array.from(clientMap.values());
    },
    enabled: shouldLoad,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  const clients = allClients || [];

  return (
    <section ref={sectionRef} className="border-t border-border bg-card py-16 md:py-24 overflow-hidden">
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
        {shouldLoad && clients.length > 0 ? (
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
