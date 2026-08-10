import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EnrichedContextData {
  frameworkAnswers: string;
  contentAnalyses: string;
  researchData: string;
  products: string;
  strategicData: string;
  seasonalityDates: string;
  monthlyFocus: string;
}

export function useEnrichedContext(consultingMonthId?: string, clientId?: string) {
  return useQuery({
    queryKey: ['enriched-context', consultingMonthId, clientId],
    queryFn: async (): Promise<EnrichedContextData> => {
      const results: EnrichedContextData = {
        frameworkAnswers: '',
        contentAnalyses: '',
        researchData: '',
        products: '',
        strategicData: '',
        seasonalityDates: '',
        monthlyFocus: '',
      };

      if (!consultingMonthId && !clientId) return results;

      // Fetch all data in parallel
      const promises: Promise<void>[] = [];

      // 1. Framework answers for this consulting month
      if (consultingMonthId) {
        promises.push(
          (async () => {
            const { data: instances } = await supabase
              .from('framework_instances')
              .select('id, status, framework:frameworks(name, slug)')
              .eq('consulting_month_id', consultingMonthId)
              .limit(10); // Limiting instances for better performance

            if (!instances?.length) return;

            const instanceIds = instances.map(i => i.id);
            const { data: answers } = await supabase
              .from('framework_answers')
              .select('instance_id, question:framework_questions(question_text), answer_text')
              .in('instance_id', instanceIds)
              .not('answer_text', 'is', null)
              .limit(50); // Limiting total answers

            if (answers?.length) {
              const grouped: Record<string, string[]> = {};
              for (const a of answers) {
                const inst = instances.find(i => i.id === a.instance_id);
                const fwName = (inst?.framework as any)?.name || 'Framework';
                if (!grouped[fwName]) grouped[fwName] = [];
                const qText = (a.question as any)?.question_text || '';
                if (a.answer_text && a.answer_text.trim()) {
                  // Reduced substring length from 300 to 200
                  grouped[fwName].push(`${qText}: ${a.answer_text.substring(0, 200)}`);
                }
              }
              results.frameworkAnswers = Object.entries(grouped)
                .map(([name, items]) => `[${name}]\n${items.join('\n')}`)
                .join('\n\n');
            }
          })()
        );

        // 2. Content analyses for this month
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('content_analyses')
              .select('category, content')
              .eq('consulting_month_id', consultingMonthId)
              .order('updated_at', { ascending: false })
              .limit(5); // Only latest 5 analyses

            if (data?.length) {
              results.contentAnalyses = data
                .map(d => `[${d.category.toUpperCase()}]\n${d.content.substring(0, 300)}`)
                .join('\n\n');
            }
          })()
        );

        // 3. Firecrawl research data
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('firecrawl_research_data')
              .select('title, content, source_type')
              .eq('consulting_month_id', consultingMonthId)
              .order('created_at', { ascending: false })
              .limit(5); // Only latest 5 items

            if (data?.length) {
              results.researchData = data
                .map(d => `[${d.source_type}] ${d.title || ''}: ${d.content.substring(0, 300)}`)
                .join('\n\n');
            }
          })()
        );

        // 4. Seasonality dates
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('seasonality_dates')
              .select('title, date, category, importance, notes')
              .eq('consulting_month_id', consultingMonthId)
              .order('date')
              .limit(20);

            if (data?.length) {
              results.seasonalityDates = data
                .map(d => `${d.date} - ${d.title} (${d.category || 'geral'})${d.notes ? ': ' + d.notes.substring(0, 100) : ''}`)
                .join('\n');
            }
          })()
        );

        // 5. Monthly focus/notes
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('consulting_months')
              .select('monthly_focus, notes')
              .eq('id', consultingMonthId)
              .single();

            if (data) {
              const parts = [];
              if (data.monthly_focus) parts.push(`Foco: ${data.monthly_focus}`);
              if (data.notes) parts.push(`Notas: ${data.notes.substring(0, 500)}`);
              results.monthlyFocus = parts.join('\n');
            }
          })()
        );
      }

      // 6. Client products
      if (clientId) {
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('client_products')
              .select('name, description, category, price, features')
              .eq('client_id', clientId)
              .eq('is_active', true)
              .limit(10); // Limit products list

            if (data?.length) {
              results.products = data
                .map(p => `${p.name}: ${p.description?.substring(0, 200) || 'Sem descrição'}`)
                .join('\n');
            }
          })()
        );

        // 7. Client strategic data
        promises.push(
          (async () => {
            const { data } = await supabase
              .from('client_strategic_data')
              .select('data_key, data_value, source_framework')
              .eq('client_id', clientId)
              .order('updated_at', { ascending: false })
              .limit(10); // Reduced from 20 to 10

            if (data?.length) {
              results.strategicData = data
                .map(d => `${d.data_key}: ${d.data_value.substring(0, 200)}`)
                .join('\n');
            }
          })()
        );
      }

      await Promise.all(promises);
      return results;
    },
    enabled: !!(consultingMonthId || clientId),
    staleTime: 10 * 60 * 1000, // Increased to 10 min cache
    gcTime: 30 * 60 * 1000, // Explicit gcTime
  });
}
