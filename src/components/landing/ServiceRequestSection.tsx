import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ServiceRequestForm {
  name: string;
  whatsapp: string;
  email: string;
  service_id: string;
  message: string;
}

const ServiceRequestSection = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ServiceRequestForm>({
    name: '', whatsapp: '', email: '', service_id: '', message: '',
  });

  const { data: services } = useQuery({
    queryKey: ['landing-services-list'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name, description')
        .eq('is_active', true)
        .order('display_order');
      return data || [];
    },
  });

  const selectedService = services?.find(s => s.id === form.service_id);

  const handleSubmit = async () => {
    if (!form.name || !form.whatsapp || !form.service_id) {
      toast.error('Preencha nome, WhatsApp e escolha um serviço.');
      return;
    }

    setLoading(true);
    try {
      const serviceName = selectedService?.name || 'Serviço';
      const servicePrice = selectedService?.description ? undefined : undefined;

      const { error } = await supabase.from('service_requests').insert({
        name: form.name.trim(),
        email: form.email.trim() || null,
        whatsapp: form.whatsapp.trim(),
        service_id: form.service_id,
        service_name: serviceName,
        message: form.message.trim() || null,
      });

      if (error) throw error;

      // Auto-generate quote and send via WhatsApp
      try {
        // Get service details including price
        const { data: serviceData } = await supabase
          .from('services')
          .select('name, default_price, description')
          .eq('id', form.service_id)
          .single();

        if (serviceData) {
          // Generate quote code
          const { data: codeData } = await supabase.rpc('generate_quote_code');
          const code = codeData || `PFMK-${Date.now().toString(36).toUpperCase()}`;

          const validUntil = new Date();
          validUntil.setDate(validUntil.getDate() + 10);

          const items = [{
            name: serviceData.name,
            description: serviceData.description || '',
            price: serviceData.default_price || 0,
            quantity: 1,
          }];

          const totalValue = serviceData.default_price || 0;

          // Create quote (client_id is nullable for agency-level quotes)
          await supabase.from('crm_quotes').insert({
            code,
            client_id: null as any,
            lead_name: form.name.trim(),
            lead_phone: form.whatsapp.trim(),
            lead_email: form.email.trim() || null,
            title: `Proposta: ${serviceData.name}`,
            items: items as any,
            total_value: totalValue,
            discount_percent: 0,
            discount_value: 0,
            final_value: totalValue,
            valid_until: validUntil.toISOString().split('T')[0],
            status: 'sent',
          });

          // Build quote URL
          const quoteUrl = `${window.location.origin}/orcamento/${code}`;

          // Send quote link via WhatsApp to the lead AND notify staff
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              type: 'service_request_quote',
              title: `Nova Solicitação: ${serviceName}`,
              message: `Olá ${form.name}! 😊\n\nPreparei uma proposta exclusiva do serviço *${serviceName}* para você:\n\n🔗 ${quoteUrl}\n\nDá uma olhada e me diz o que achou! Válida por 10 dias.`,
              target: 'client',
              client_phone: form.whatsapp,
            },
          });

          // Also notify staff about new request
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              type: 'service_request',
              title: 'Nova Solicitação de Serviço',
              message: `📋 ${form.name} solicitou *${serviceName}*\n📱 ${form.whatsapp}\n${form.message ? `💬 ${form.message}` : ''}\n\n🔗 Proposta enviada: ${quoteUrl}`,
              target: 'staff',
            },
          });
        }
      } catch (e) {
        console.error('Auto-quote generation failed:', e);
        // Fallback: notify staff only
        try {
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: {
              type: 'service_request',
              title: 'Nova Solicitação de Serviço',
              message: `📋 ${form.name} solicitou *${serviceName}*\n📱 ${form.whatsapp}\n${form.message ? `💬 ${form.message}` : ''}`,
              target: 'staff',
            },
          });
        } catch (e2) {
          console.error('WhatsApp notification failed:', e2);
        }
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting service request:', error);
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="solicitar" className="relative py-32 md:py-40 bg-[hsl(210,20%,97%)]">
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span className="text-performake-accent text-[11px] font-mono uppercase tracking-[0.2em]">Serviços avulsos</span>
          <h2 className="text-3xl md:text-4xl font-black text-[hsl(186,94%,7%)] mt-4 tracking-tight">
            Solicite um serviço
          </h2>
          <p className="text-[hsl(184,14%,50%)] mt-4 max-w-lg mx-auto leading-relaxed">
            Precisa de algo pontual? Escolha o serviço e entre em contato.
          </p>
        </motion.div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-performake-accent/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} className="text-performake-accent" />
            </div>
            <h3 className="text-2xl font-bold text-[hsl(186,94%,7%)] mb-3">Solicitação enviada!</h3>
            <p className="text-[hsl(184,14%,50%)]">
              Nossa equipe entrará em contato pelo WhatsApp em breve.
            </p>
          </motion.div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-3"
            >
              <label className="text-[hsl(184,14%,45%)] text-xs font-mono uppercase tracking-wider block mb-4">Escolha o serviço</label>
              {services?.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setForm({ ...form, service_id: service.id })}
                  className={`w-full text-left p-5 rounded-xl border transition-all duration-200 ${
                    form.service_id === service.id
                      ? 'border-performake-accent bg-performake-accent/5 ring-1 ring-performake-accent/20'
                      : 'border-gray-200 bg-white hover:border-performake-accent/30'
                  }`}
                >
                  <h4 className="font-bold text-[hsl(186,94%,7%)] text-sm">{service.name}</h4>
                  {service.description && (
                    <p className="text-[hsl(184,14%,55%)] text-xs mt-1 leading-relaxed">{service.description}</p>
                  )}
                </button>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-5"
            >
              <div>
                <label className="text-[hsl(184,14%,45%)] text-xs font-mono uppercase tracking-wider block mb-2">Nome *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome"
                  className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-[hsl(186,94%,7%)] placeholder:text-[hsl(184,14%,70%)] focus:outline-none focus:border-performake-accent/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[hsl(184,14%,45%)] text-xs font-mono uppercase tracking-wider block mb-2">WhatsApp *</label>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-[hsl(186,94%,7%)] placeholder:text-[hsl(184,14%,70%)] focus:outline-none focus:border-performake-accent/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[hsl(184,14%,45%)] text-xs font-mono uppercase tracking-wider block mb-2">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu@email.com"
                  type="email"
                  className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-[hsl(186,94%,7%)] placeholder:text-[hsl(184,14%,70%)] focus:outline-none focus:border-performake-accent/40 transition-colors"
                />
              </div>
              <div>
                <label className="text-[hsl(184,14%,45%)] text-xs font-mono uppercase tracking-wider block mb-2">Mensagem</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Descreva o que precisa..."
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-[hsl(186,94%,7%)] placeholder:text-[hsl(184,14%,70%)] focus:outline-none focus:border-performake-accent/40 transition-colors resize-none"
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={loading || !form.name || !form.whatsapp || !form.service_id}
                className="w-full bg-performake-accent text-[hsl(186,94%,7%)] py-4 rounded-xl font-bold text-base transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-performake-accent/20"
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : (
                  <>
                    Enviar solicitação
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceRequestSection;
