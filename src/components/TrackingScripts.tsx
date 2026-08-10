import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const TrackingScripts = () => {
  const { data: settings } = useQuery({
    queryKey: ['site-tracking-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('*');
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.key] = s.value || ''; });
      return map;
    },
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
  });

  // Meta Pixel
  useEffect(() => {
    const pixelId = settings?.meta_pixel_id;
    if (!pixelId) return;
    if (document.getElementById('meta-pixel-script')) return;

    const script = document.createElement('script');
    script.id = 'meta-pixel-script';
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
      (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init','${pixelId}');fbq('track','PageView');
    `;
    document.head.appendChild(script);

    const noscript = document.createElement('noscript');
    noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
    document.body.appendChild(noscript);
  }, [settings?.meta_pixel_id]);

  // Google Analytics GA4
  useEffect(() => {
    const gaId = settings?.google_analytics_id;
    if (!gaId) return;
    if (document.getElementById('ga4-script')) return;

    const gtagScript = document.createElement('script');
    gtagScript.id = 'ga4-script';
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    document.head.appendChild(gtagScript);

    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer=window.dataLayer||[];
      function gtag(){dataLayer.push(arguments);}
      gtag('js',new Date());gtag('config','${gaId}');
    `;
    document.head.appendChild(inlineScript);
  }, [settings?.google_analytics_id]);

  return null;
};

export default TrackingScripts;
