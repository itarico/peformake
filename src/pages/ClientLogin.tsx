import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Shield, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logoWhite from '@/assets/logo-white.png';

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Preencha e-mail e senha');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('authenticate_client_portal', {
        p_email: email.trim().toLowerCase(),
        p_password: password.trim(),
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }

      const client = data[0];
      toast.success(`Bem-vindo, ${client.client_name}!`);
      navigate(`/portal/${client.portal_token}`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao autenticar. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-performake-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-performake-primary/15 via-transparent to-transparent" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-performake-accent/[0.03] blur-[200px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md"
      >
        <button
          onClick={() => navigate('/')}
          className="text-white/30 hover:text-white text-sm flex items-center gap-2 transition-colors mb-8"
        >
          <ArrowLeft size={14} /> Voltar ao início
        </button>

        <div className="text-center mb-10">
          <img src={logoWhite} alt="Peformake" className="h-14 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white tracking-tight">Portal do Cliente</h1>
          <p className="text-white/30 text-sm mt-2 font-light">
            Acesse com o e-mail e a senha fornecidos pela equipe Peformake.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-white/40 text-xs font-medium uppercase tracking-wider block mb-2">
                Seu e-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoFocus
                className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors text-lg"
              />
            </div>

            <div>
              <label className="text-white/40 text-xs font-medium uppercase tracking-wider block mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.12] rounded-xl px-5 py-4 pr-12 text-white placeholder:text-white/20 focus:outline-none focus:border-performake-accent/40 transition-colors text-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full bg-performake-accent text-[hsl(186,94%,7%)] py-4 rounded-xl font-bold text-lg shadow-2xl shadow-performake-accent/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Shield size={18} />}
            {loading ? 'Autenticando...' : 'Acessar meu portal'}
          </motion.button>
        </form>

        <div className="mt-8 text-center space-y-3">
          <p className="text-white/15 text-xs">
            Caso não tenha recebido suas credenciais, entre em contato com nossa equipe.
          </p>
          <button
            onClick={() => navigate('/diagnostico')}
            className="text-white/25 hover:text-performake-accent text-sm transition-colors"
          >
            Ainda não é cliente? <span className="underline font-semibold">Faça o diagnóstico gratuito</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
