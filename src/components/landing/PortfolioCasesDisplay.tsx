import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Play, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  niche?: string;
  serviceTags?: string[];
  variant?: 'default' | 'gastro';
  maxItems?: number;
  title?: string;
  subtitle?: string;
}

const PortfolioCasesDisplay = ({ niche, serviceTags, variant = 'default', maxItems = 12, title, subtitle }: Props) => {
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [videoModal, setVideoModal] = useState<string | null>(null);

  const { data: cases } = useQuery({
    queryKey: ['portfolio-cases-display', niche, serviceTags],
    queryFn: async () => {
      let query = supabase.from('portfolio_cases').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('display_order');
      if (niche) query = query.eq('niche', niche);
      if (serviceTags && serviceTags.length > 0) query = query.overlaps('service_tags', serviceTags);
      const { data } = await query.limit(maxItems);
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  if (!cases || cases.length === 0) return null;

  const isGastro = variant === 'gastro';
  const bgClass = isGastro ? 'bg-gastro-darker' : 'bg-performake-dark noise-overlay';
  const accentClass = isGastro ? 'text-gastro-accent' : 'text-performake-accent';
  const textClass = isGastro ? 'text-gastro-text' : 'text-white';
  const mutedClass = isGastro ? 'text-gastro-muted' : 'text-white/40';

  const openLightbox = (images: string[], startIndex: number) => {
    setLightboxImages(images);
    setLightboxIndex(startIndex);
  };

  return (
    <>
      <section className={`relative py-24 md:py-32 ${bgClass}`}>
        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-16">
            <span className={`${accentClass} text-[11px] font-medium uppercase tracking-[0.2em]`}>
              {title || 'Resultados reais'}
            </span>
            <h2 className={`text-3xl md:text-5xl font-black ${textClass} mt-4 tracking-[-0.02em]`}>
              {subtitle || 'Cases de sucesso comprovados'}
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((c: any, i: number) => {
              const images = (c.image_urls as string[]) || [];
              const videos = (c.video_urls as string[]) || [];
              const metrics = (c.metrics as Record<string, string>) || {};
              const hasMedia = images.length > 0 || videos.length > 0;

              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08 * i }}
                  className={`rounded-2xl overflow-hidden border ${isGastro ? 'border-gastro-accent/10 bg-white/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'} hover:border-white/10 transition-all duration-500 group`}
                >
                  {/* Media gallery */}
                  {hasMedia && (
                    <div className="relative aspect-[16/10] bg-black/30 overflow-hidden">
                      {images.length > 0 ? (
                        <img
                          src={images[0]}
                          alt={c.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                          onClick={() => openLightbox(images, 0)}
                          loading="lazy"
                        />
                      ) : videos.length > 0 ? (
                        <div
                          className="w-full h-full flex items-center justify-center cursor-pointer bg-black/60"
                          onClick={() => setVideoModal(videos[0])}
                        >
                          <Play size={48} className={`${accentClass} opacity-80`} />
                        </div>
                      ) : null}

                      {/* Image count badge */}
                      {images.length > 1 && (
                        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-1 rounded-full">
                          +{images.length - 1} fotos
                        </div>
                      )}

                      {/* Video button overlay */}
                      {images.length > 0 && videos.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setVideoModal(videos[0]); }}
                          className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white p-2 rounded-full hover:bg-black/90 transition-colors"
                        >
                          <Play size={14} />
                        </button>
                      )}

                      {/* Logo overlay */}
                      {c.logo_url && (
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg p-1.5">
                          <img src={c.logo_url} alt="" className="h-6 w-auto object-contain" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-6">
                    {!hasMedia && c.logo_url && (
                      <img src={c.logo_url} alt="" className="h-8 w-auto object-contain mb-4 opacity-60" />
                    )}

                    {/* Metrics */}
                    {Object.keys(metrics).length > 0 && (
                      <div className="flex flex-wrap gap-3 mb-4">
                        {Object.entries(metrics).map(([key, val]) => (
                          <div key={key} className="text-center">
                            <div className={`text-2xl font-black ${accentClass}`}>{val}</div>
                            <div className={`text-[10px] uppercase tracking-widest ${mutedClass}`}>{key}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <h3 className={`font-bold text-lg ${textClass} mb-1`}>{c.client_name}</h3>
                    <p className={`text-sm font-medium ${accentClass} mb-3`}>{c.title}</p>
                    {c.description && <p className={`text-sm ${mutedClass} leading-relaxed`}>{c.description}</p>}

                    {/* Service tags */}
                    {(c.service_tags as string[])?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {(c.service_tags as string[]).map((tag: string) => (
                          <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full border ${isGastro ? 'border-gastro-accent/20 text-gastro-accent/60' : 'border-white/10 text-white/30'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightboxImages.length > 0 && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={() => setLightboxImages([])}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white z-10"><X size={24} /></button>
          {lightboxImages.length > 1 && (
            <>
              <button className="absolute left-4 text-white/60 hover:text-white z-10" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + lightboxImages.length) % lightboxImages.length); }}><ChevronLeft size={32} /></button>
              <button className="absolute right-14 text-white/60 hover:text-white z-10" onClick={e => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % lightboxImages.length); }}><ChevronRight size={32} /></button>
            </>
          )}
          <img src={lightboxImages[lightboxIndex]} alt="" className="max-w-full max-h-[85vh] object-contain rounded-xl" onClick={e => e.stopPropagation()} />
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-4 text-white/40 text-sm">{lightboxIndex + 1} / {lightboxImages.length}</div>
          )}
        </div>
      )}

      {/* Video Modal */}
      {videoModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setVideoModal(null)}>
          <button className="absolute top-4 right-4 text-white/60 hover:text-white"><X size={24} /></button>
          <video src={videoModal} controls autoPlay className="max-w-full max-h-[80vh] rounded-xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
};

export default PortfolioCasesDisplay;
