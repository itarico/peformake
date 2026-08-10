import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users } from 'lucide-react';

const TeamSection = () => {
  const { data: members } = useQuery({
    queryKey: ['landing-team'],
    queryFn: async () => {
      const { data } = await supabase
        .from('staff_members')
        .select('id, full_name, job_title, avatar_url')
        .eq('is_active', true)
        .eq('show_on_landing', true)
        .order('full_name');
      return data || [];
    },
  });

  const hasMembers = members && members.length > 0;

  return (
    <section className="relative py-32 md:py-40 bg-white">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-performake-accent text-[11px] font-medium uppercase tracking-[0.2em]">Equipe</span>
          <h2 className="text-3xl md:text-5xl font-black text-[hsl(186,94%,7%)] mt-4 tracking-[-0.02em]">
            Quem faz acontecer
          </h2>
        </motion.div>

        {hasMembers ? (
          <div className={`grid gap-10 justify-items-center ${
            members.length <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-3 lg:grid-cols-4'
          }`}>
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.15 * i }}
                className="text-center group cursor-default"
              >
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden mx-auto mb-6 bg-[hsl(210,20%,97%)] border border-[hsl(210,20%,93%)] transition-all duration-500 group-hover:shadow-[0_0_30px_6px_hsla(176,100%,50%,0.12)] group-hover:border-performake-accent/20 group-hover:scale-105">
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-performake-accent/40 group-hover:text-performake-accent/70 transition-colors duration-500">
                      {member.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(186,94%,7%)]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
                <h3 className="text-[hsl(186,94%,7%)] font-bold text-base">{member.full_name}</h3>
                <p className="text-[hsl(184,14%,55%)] text-sm mt-1 font-light">
                  {member.job_title || 'Equipe Peformake'}
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-2xl bg-performake-accent/5 flex items-center justify-center mx-auto mb-6">
              <Users size={36} className="text-performake-accent/40" />
            </div>
            <p className="text-[hsl(184,14%,45%)] text-lg font-light max-w-md mx-auto leading-relaxed">
              Um time multidisciplinar de estrategistas, designers e especialistas em performance digital trabalhando para transformar seu negócio.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default TeamSection;
