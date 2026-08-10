import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Art, WorkMonth, Client, Designer, ART_TYPE_LABELS, ART_STATUS_LABELS, ART_STATUS_COLORS, MONTH_NAMES, ArtStatus, ArtType } from '@/types/database';
import { formatDistanceToNow, differenceInHours, isPast, addHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Loader2, 
  Palette, 
  Upload, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  Users,
  FileText,
  Eye,
  ImageIcon,
  Pencil,
  ChevronDown,
  RotateCcw,
  Trash2,
  Download,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStaffAuth } from '@/contexts/StaffAuthContext';
import { Navigate } from 'react-router-dom';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { ImageLightbox } from '@/components/ImageLightbox';
import { ImageCarousel } from '@/components/ImageCarousel';
import { ArtDetailDialog } from '@/components/ArtDetailDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ArtWithDetails extends Art {
  work_month: WorkMonth & { client: Client };
}

interface ClientArtsGroup {
  client: Client;
  arts: ArtWithDetails[];
  pendingCount: number;
}

export default function Production() {
  const { isDesigner, isAdmin, isSocialMedia, user } = useAuth();
  const { staffMember, isAdmin: isStaffAdmin, isSocialMedia: isStaffSocialMedia, isDesigner: isStaffDesigner } = useStaffAuth();
  const queryClient = useQueryClient();
  
  // Determine effective roles (staff member takes precedence)
  const effectiveIsAdmin = staffMember ? isStaffAdmin : isAdmin;
  const effectiveIsSocialMedia = staffMember ? isStaffSocialMedia : isSocialMedia;
  const effectiveIsDesigner = staffMember ? isStaffDesigner : isDesigner;
  
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [detailArt, setDetailArt] = useState<ArtWithDetails | null>(null);
  const [uploadUrls, setUploadUrls] = useState<Record<string, string[]>>({});
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showAwaitingApprovalModal, setShowAwaitingApprovalModal] = useState(false);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deleteArt, setDeleteArt] = useState<ArtWithDetails | null>(null);
  const [showAddDesignDialog, setShowAddDesignDialog] = useState(false);
  const [newDesignClientId, setNewDesignClientId] = useState('');
  const [newDesignType, setNewDesignType] = useState<string>('post_instagram');
  const [newDesignUploadUrls, setNewDesignUploadUrls] = useState<string[]>([]);

  // Fetch all designers (for admin/social media view)
  const { data: allDesigners } = useQuery({
    queryKey: ['all-designers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Designer[];
    },
    enabled: effectiveIsAdmin || effectiveIsSocialMedia,
    staleTime: 1000 * 60 * 60, // Designer list changes rarely
  });

  // Fetch designer info for the current user (designer view via Supabase auth)
  const { data: myDesignerByUser, isLoading: isLoadingDesignerByUser, isFetched: isFetchedDesignerByUser } = useQuery({
    queryKey: ['my-designer-by-user', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data as Designer;
    },
    enabled: !!user?.id && isDesigner && !isAdmin && !isSocialMedia && !staffMember,
    staleTime: Infinity,
  });

  // Fetch designer info for staff member (designer view via staff login)
  const { data: myDesignerByStaff, isLoading: isLoadingDesignerByStaff, isFetched: isFetchedDesignerByStaff } = useQuery({
    queryKey: ['my-designer-by-staff', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('designers')
        .select('*')
        .eq('staff_member_id', staffMember?.id)
        .single();

      if (error) throw error;
      return data as Designer;
    },
    enabled: !!staffMember?.id && isStaffDesigner,
    staleTime: Infinity,
  });

  // For Social Media staff: fetch clients assigned to them, then get their designers
  const { data: assignedClientsDesignerIds } = useQuery({
    queryKey: ['assigned-clients-designers', staffMember?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('designer_id')
        .eq('social_media_staff_id', staffMember?.id)
        .eq('is_active', true);

      if (error) throw error;
      
      // Get unique designer IDs from assigned clients
      const designerIds = [...new Set(data?.map(c => c.designer_id).filter(Boolean) as string[])];
      return designerIds;
    },
    enabled: !!staffMember?.id && isStaffSocialMedia && !isStaffAdmin,
  });

  // Filter designers for Social Media staff (only show designers of their assigned clients)
  const filteredDesigners = (effectiveIsAdmin) 
    ? allDesigners 
    : (effectiveIsSocialMedia && assignedClientsDesignerIds) 
      ? allDesigners?.filter(d => assignedClientsDesignerIds.includes(d.id))
      : allDesigners;

  // Determine which designer to use
  const myDesigner = staffMember ? myDesignerByStaff : myDesignerByUser;
  const activeDesigner = (effectiveIsAdmin || effectiveIsSocialMedia)
    ? allDesigners?.find(d => d.id === selectedDesignerId) 
    : myDesigner;
  
  const activeDesignerId = activeDesigner?.id;
  const activeStaffMemberId = activeDesigner?.staff_member_id || activeDesignerId;

  // Fetch staff member info for deadline tracking
  const { data: designerStaffMember } = useQuery({
    queryKey: ['designer-staff', activeDesignerId],
    queryFn: async () => {
      if (!activeDesignerId) return null;
      // Get staff_member_id from designers table (not in TS type but exists in DB)
      const { data: designerRow } = await supabase
        .from('designers')
        .select('staff_member_id')
        .eq('id', activeDesignerId)
        .single();
      if (!designerRow?.staff_member_id) return null;
      const { data } = await supabase
        .from('staff_members')
        .select('max_hours_per_art')
        .eq('id', designerRow.staff_member_id)
        .single();
      return data;
    },
    enabled: !!activeDesignerId,
    staleTime: Infinity, // Staff member settings change rarely
  });
  const maxHoursPerArt = (designerStaffMember as any)?.max_hours_per_art || 48;

  // Fetch clients assigned to the active designer (for "Add Design" feature)
  const { data: designerClients } = useQuery({
    queryKey: ['designer-clients', activeStaffMemberId],
    queryFn: async () => {
      if (!activeStaffMemberId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('designer_id', activeStaffMemberId)
        .eq('is_active', true)
        .eq('has_design_service', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!activeStaffMemberId && showAddDesignDialog, // Only fetch when dialog is open
    staleTime: 1000 * 60 * 60, // Clients list changes rarely
  });

  const { data: arts, isLoading } = useQuery({
    queryKey: ['production-arts', activeStaffMemberId],
    queryFn: async () => {
      if (!activeStaffMemberId) return [];

      // Only show arts after the briefing has been sent by Social Media
      // (i.e. exclude 'pending_briefing' status)
      const statuses: ArtStatus[] = ['ready_for_production', 'in_production', 'awaiting_approval', 'revision_requested', 'approved'];

      // Logic to filter arts exclusively by the currently assigned designer for the client.
      // This ensures that if a client is reassigned to a new designer, the arts move to the new designer exclusively.
      const { data, error } = await supabase
        .from('arts')
        .select(`
          *,
          work_month:work_months!inner(
            *,
            client:clients!inner(*)
          )
        `)
        .filter('work_month.client.designer_id', 'eq', activeStaffMemberId)
        .filter('work_month.client.is_active', 'eq', true)
        .filter('work_month.client.has_design_service', 'eq', true)
        .in('status', statuses)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data as any[]).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    },
    enabled: !!activeStaffMemberId,
    staleTime: 1000 * 15, // 15s — briefings precisam aparecer rapidamente
    gcTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    refetchInterval: 1000 * 60, // refetch a cada 60s enquanto a aba está aberta
  });

  // Current month/year
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const updateArtMutation = useMutation({
    mutationFn: async ({ artId, data }: { artId: string; data: Partial<Art> }) => {
      const { updateArtWithAccess } = await import('@/lib/updateArtWithAccess');
      await updateArtWithAccess(artId, data as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-arts'] });
    },
  });


  const deleteArtMutation = useMutation({
    mutationFn: async (artId: string) => {
      const { error } = await supabase
        .from('arts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', artId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-arts'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-arts'] });
      toast.success('Arte movida para a lixeira!');
      setDeleteArt(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir arte: ' + error.message);
    },
  });

  const restoreArtMutation = useMutation({
    mutationFn: async (artId: string) => {
      const { error } = await supabase
        .from('arts')
        .update({ deleted_at: null })
        .eq('id', artId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-arts'] });
      queryClient.invalidateQueries({ queryKey: ['deleted-arts'] });
      toast.success('Arte restaurada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao restaurar arte: ' + error.message);
    },
  });
  const createArtMutation = useMutation({
    mutationFn: async ({ clientId, artType, uploadUrls: artUploadUrls }: { clientId: string; artType: string; uploadUrls: string[] }) => {
      // Find current month's work_month for this client
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      let { data: workMonth } = await supabase
        .from('work_months')
        .select('id')
        .eq('client_id', clientId)
        .eq('year', currentYear)
        .eq('month', currentMonth)
        .single();

      // If no work_month for this month, find the latest one
      if (!workMonth) {
        const { data: latestWM } = await supabase
          .from('work_months')
          .select('id')
          .eq('client_id', clientId)
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1)
          .single();
        workMonth = latestWM;
      }

      if (!workMonth) throw new Error('Nenhum mês de trabalho encontrado para este cliente. Ative o serviço de design primeiro.');

      // Get next art number
      const { data: existingArts } = await supabase
        .from('arts')
        .select('art_number')
        .eq('work_month_id', workMonth.id)
        .order('art_number', { ascending: false })
        .limit(1);

      const nextNumber = (existingArts?.[0]?.art_number || 0) + 1;

      const hasImages = artUploadUrls.length > 0;

      const { error } = await supabase
        .from('arts')
        .insert({
          work_month_id: workMonth.id,
          art_number: nextNumber,
          art_type: artType as ArtType,
          title: null,
          description: null,
          final_art_url: hasImages ? artUploadUrls[0] : null,
          final_art_urls: artUploadUrls,
          status: hasImages ? 'awaiting_approval' : 'in_production',
          is_extra: true,
          designer_id: activeStaffMemberId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-arts'] });
      toast.success('Design adicionado com sucesso!');
      setShowAddDesignDialog(false);
      setNewDesignClientId('');
      setNewDesignType('post_instagram');
      setNewDesignUploadUrls([]);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao adicionar design');
    },
  });

  const downloadImageUrls = async (urls: string[], prefix: string) => {
    for (let i = 0; i < urls.length; i++) {
      try {
        const response = await fetch(urls[i]);
        if (!response.ok) throw new Error('Não foi possível acessar a imagem');
        const blob = await response.blob();
        const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${prefix}-${i + 1}.${extension}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        if (i < urls.length - 1) await new Promise(resolve => setTimeout(resolve, 250));
      } catch (error) {
        console.error('Error downloading image:', error);
        const a = document.createElement('a');
        a.href = urls[i];
        a.download = `${prefix}-${i + 1}`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  const handleDownloadReferenceImages = async (art: ArtWithDetails) => {
    const urls: string[] = [];
    if (art.reference_image_url) urls.push(art.reference_image_url);
    
    if (urls.length === 0) {
      toast.error('Nenhuma imagem de referência');
      return;
    }
    
    toast.info(`Baixando ${urls.length} referência(s)...`);
    await downloadImageUrls(urls, `ref-${art.work_month.client.name}-${art.art_number}`);
    handleDownloadPDF(art);
  };

  const handleDownloadImages = async (art: ArtWithDetails) => {
    const urls = art.final_art_urls?.length > 0 
      ? [...art.final_art_urls] 
      : (art.final_art_url ? [art.final_art_url] : []);
    
    if (urls.length === 0) {
      toast.error('Nenhuma imagem para baixar');
      return;
    }
    
    toast.info(`Baixando ${urls.length} imagem(ns)...`);
    await downloadImageUrls(urls, `arte-${art.art_number}`);
  };

  const getCarouselBriefingImageUrls = (art: ArtWithDetails): string[] => {
    if (art.art_type !== 'carrossel' || !art.carousel_slides?.length) return [];

    return art.carousel_slides.flatMap((slide: any) => {
      const urls = Array.isArray(slide?.image_urls) ? slide.image_urls.filter(Boolean) : [];
      if (slide?.image_url && !urls.includes(slide.image_url)) {
        urls.push(slide.image_url);
      }
      return urls;
    });
  };

  const handleDownloadCarouselBriefingImages = async (art: ArtWithDetails) => {
    const urls = getCarouselBriefingImageUrls(art);
    if (urls.length === 0) {
      toast.error('Nenhuma imagem do carrossel para baixar');
      return;
    }

    toast.info(`Baixando ${urls.length} imagem(ns) do carrossel...`);
    await downloadImageUrls(urls, `carrossel-${art.art_number}`);
  };

  const handleUpload = (art: ArtWithDetails, urls: string[]) => {
    setUploadUrls(prev => ({ ...prev, [art.id]: urls }));
    
    updateArtMutation.mutate(
      {
        artId: art.id,
        data: {
          final_art_url: urls[0] || null, // Keep backward compatibility
          final_art_urls: urls,
          status: 'awaiting_approval',
          revision_comment: null, // Clear revision comment
        },
      },
      {
        onSuccess: () => {
          toast.success('Arte enviada para aprovação!');
        },
        onError: (error: any) => {
          toast.error('Erro ao enviar arte: ' + error.message);
        },
      }
    );
  };

  const handleCardClick = (art: ArtWithDetails) => {
    // Auto-update status if needed
    if (art.status === 'ready_for_production') {
      updateArtMutation.mutate(
        { artId: art.id, data: { status: 'in_production' } },
        {
          onSuccess: () => {
            toast.info('Status atualizado para "Em Produção"');
            setDetailArt(art);
          },
        }
      );
    } else {
      setDetailArt(art);
    }
  };


  const handleDownloadPDF = async (art: ArtWithDetails) => {
    const printContent = `
      <html>
        <head>
          <title>Briefing - ${art.work_month.client.name} - Arte ${art.art_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .logo { max-width: 120px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
            .value { font-size: 16px; margin-bottom: 15px; }
            .caption { background: #f5f5f5; padding: 15px; border-radius: 8px; }
            .reference-img { max-width: 100%; max-height: 400px; margin-top: 10px; }
            .revision { background: #fee; border: 1px solid #fcc; padding: 15px; border-radius: 8px; margin: 20px 0; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${art.work_month.client.logo_url ? `<img src="${art.work_month.client.logo_url}" class="logo" />` : ''}
          <h1>${art.work_month.client.name}</h1>
          <p><strong>${MONTH_NAMES[art.work_month.month - 1]} ${art.work_month.year}</strong> • Arte ${art.art_number}</p>
          
          <div class="section">
            <div class="label">Tipo</div>
            <div class="value">${art.art_type ? ART_TYPE_LABELS[art.art_type] : 'Não definido'}</div>
          </div>
          
          <div class="section">
            <div class="label">Título</div>
            <div class="value">${art.title || 'Sem título'}</div>
          </div>

          ${art.art_type !== 'carrossel' && (art.headline || art.subtitle || art.cta) ? `
            <div class="section" style="background: #f0f7ff; padding: 15px; border-radius: 8px;">
              ${art.headline ? `<div class="label" style="color: #0066cc;">Headline</div><div class="value" style="font-weight: bold; font-size: 20px;">${art.headline}</div>` : ''}
              ${art.subtitle ? `<div class="label" style="color: #0066cc;">Subtítulo</div><div class="value">${art.subtitle}</div>` : ''}
              ${art.cta ? `<div class="label" style="color: #0066cc;">CTA</div><div class="value" style="font-weight: bold; color: #0066cc;">${art.cta}</div>` : ''}
            </div>
          ` : ''}

          ${art.art_type === 'carrossel' && art.carousel_slides && art.carousel_slides.length > 0 ? `
            <div class="section">
              <div class="label">Cards do Carrossel (${art.carousel_slides.length})</div>
              ${art.carousel_slides.map((slide: any, idx: number) => `
                <div style="margin-bottom: 20px; border-left: 3px solid #ccc; padding-left: 15px;">
                  <div class="label">Card ${idx + 1}</div>
                  ${slide.headline ? `<div class="value" style="font-weight: bold;">${slide.headline}</div>` : ''}
                  ${slide.description ? `<div class="value" style="font-size: 14px;">${slide.description}</div>` : ''}
                  ${slide.image_url ? `<img src="${slide.image_url}" style="max-height: 150px; border-radius: 4px; margin-top: 5px;" />` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
          
          <div class="section">
            <div class="label">${art.art_type === 'carrossel' ? 'Instruções Gerais' : 'Descrição'}</div>
            <div class="value">${art.description || 'Sem descrição'}</div>
          </div>
          
          ${art.caption && art.art_type !== 'story' ? `
            <div class="section">
              <div class="label">Legenda para o Post</div>
              <div class="caption">${art.caption}</div>
            </div>
          ` : ''}

          ${art.reference_link ? `
            <div class="section">
              <div class="label">Link de Referência</div>
              <div class="value"><a href="${art.reference_link}" target="_blank">${art.reference_link}</a></div>
            </div>
          ` : ''}
          
          ${art.observations ? `
            <div class="section">
              <div class="label">Observações</div>
              <div class="value">${art.observations}</div>
            </div>
          ` : ''}
          
          ${art.revision_comment ? `
            <div class="revision">
              <div class="label" style="color: #c00;">Alteração Solicitada</div>
              <div class="value">${art.revision_comment}</div>
            </div>
          ` : ''}
          
          ${(art.reference_image_url || (art.reference_image_urls && art.reference_image_urls.length > 0)) ? `
            <div class="section">
              <div class="label">Referências Visuais</div>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                ${art.reference_image_urls && art.reference_image_urls.length > 0 
                  ? art.reference_image_urls.map((url: string) => `<img src="${url}" class="reference-img" style="aspect-ratio: 1; object-fit: cover;" />`).join('')
                  : `<img src="${art.reference_image_url}" class="reference-img" />`}
              </div>
            </div>
          ` : ''}
        </body>
      </html>
    `;
    
    // Create a hidden iframe for direct printing/downloading
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(printContent);
      doc.close();
      
      // Wait for images to load then print
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Remove iframe after printing
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      };
    }
  };

  if (!effectiveIsDesigner && !effectiveIsAdmin && !effectiveIsSocialMedia) {
    return <Navigate to="/dashboard" replace />;
  }

  // Calculate financial summary — include all relevant statuses
  
  const currentMonthArts = arts?.filter(a => 
    a.work_month.month === currentMonth && 
    a.work_month.year === currentYear
  ) || [];
  
  // Total = all arts this month
  const totalArts_month = currentMonthArts.length;
  
  const costPerArt = activeDesigner?.cost_per_art || 0;
  // A Receber = all arts the designer completed this month (approved + awaiting_approval + in_production)
  const completedArtsCount = currentMonthArts.filter(a => 
    ['approved', 'awaiting_approval'].includes(a.status)
  ).length;
  const totalEarnings = completedArtsCount * Number(costPerArt);

  // Group arts by client - only show active/pending arts in the main grid
  const groupedArts = useMemo(() => {
    const groups: ClientArtsGroup[] = [];
    const displayArts = (arts || []).filter(art => 
      ['ready_for_production', 'in_production', 'awaiting_approval', 'revision_requested'].includes(art.status)
    );

    displayArts.forEach(art => {
      const existingGroup = groups.find(g => g.client.id === art.work_month.client.id);
      if (existingGroup) {
        existingGroup.arts.push(art);
        existingGroup.pendingCount++;
      } else {
        groups.push({
          client: art.work_month.client,
          arts: [art],
          pendingCount: 1,
        });
      }
    });

    // Sort groups by the oldest 'updated_at' of their arts (most delayed first)
    return groups.sort((a, b) => {
      const oldestA = Math.min(...a.arts.map(art => new Date(art.updated_at).getTime()));
      const oldestB = Math.min(...b.arts.map(art => new Date(art.updated_at).getTime()));
      return oldestA - oldestB;
    });
  }, [arts]);

  const pendingArtsCount = arts?.filter(a => ['ready_for_production', 'in_production'].includes(a.status)).length || 0;
  const revisionRequestedCount = arts?.filter(a => a.status === 'revision_requested').length || 0;
  const awaitingApprovalCount = arts?.filter(a => a.status === 'awaiting_approval').length || 0;
  const approvedArtsCount = arts?.filter(a => a.status === 'approved' && a.work_month.month === currentMonth && a.work_month.year === currentYear).length || 0;
  const totalArts = arts?.length || 0;

  // Fetch deleted arts
  const { data: deletedArts } = useQuery({
    queryKey: ['deleted-arts', activeStaffMemberId],
    queryFn: async () => {
      if (!activeStaffMemberId) return [];
      const { data, error } = await supabase
        .from('arts')
        .select('*, work_month:work_months!inner(*, client:clients!inner(*))')
        .filter('work_month.client.designer_id', 'eq', activeStaffMemberId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) throw error;
      return data as ArtWithDetails[];
    },
    enabled: !!activeStaffMemberId && showDeletedModal, // Only fetch when needed
    staleTime: 1000 * 60 * 5,
  });

  const deletedCount = deletedArts?.length || 0;

  // Show loading only during initial fetch for designers
  const isDesignerQueryLoading = staffMember 
    ? (isLoadingDesignerByStaff && !isFetchedDesignerByStaff)
    : (isLoadingDesignerByUser && !isFetchedDesignerByUser);
  
  const isDesignerLoading = effectiveIsDesigner && !effectiveIsAdmin && !effectiveIsSocialMedia && isDesignerQueryLoading;

  if (isDesignerLoading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in px-1 md:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Produção</h1>
          <p className="text-sm md:text-base text-muted-foreground">Carregando suas artes...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // If designer but no designer record found after fetch - show message instead of infinite loading
  const hasFetchedDesignerData = staffMember ? isFetchedDesignerByStaff : isFetchedDesignerByUser;
  if (effectiveIsDesigner && !effectiveIsAdmin && !effectiveIsSocialMedia && !myDesigner && hasFetchedDesignerData) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in px-1 md:px-0">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Produção</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie as artes atribuídas a você</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-3 md:px-6">
            <Palette className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-center">Perfil não encontrado</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
              Seu perfil de designer não foi encontrado no sistema. Entre em contato com o administrador.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-1 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Produção</h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {(effectiveIsAdmin || effectiveIsSocialMedia) ? 'Acompanhe a produção de artes por designer' : 'Gerencie as artes atribuídas a você'}
          </p>
        </div>
        {activeDesignerId && designerClients && designerClients.length > 0 && (
          <Button
            onClick={() => setShowAddDesignDialog(true)}
            className="gap-2"
            size="sm"
            aria-label="Adicionar novo design"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar Design</span>
            <span className="sm:hidden">Adicionar</span>
          </Button>
        )}
      </div>

      {/* Admin/Social Media: Designer Selector */}
      {(effectiveIsAdmin || effectiveIsSocialMedia) && (
        <div className="flex items-center gap-4">
          <div className="w-full max-w-none sm:max-w-sm">
            <Select
              value={selectedDesignerId}
              onValueChange={setSelectedDesignerId}
            >
              <SelectTrigger className="text-sm md:text-base">
                <SelectValue placeholder="Selecione um designer" />
              </SelectTrigger>
              <SelectContent>
                {filteredDesigners?.map((designer) => (
                  <SelectItem key={designer.id} value={designer.id}>
                    {designer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* No designer selected (admin/social media) */}
      {(effectiveIsAdmin || effectiveIsSocialMedia) && !selectedDesignerId && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-3 md:px-6">
            <Users className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
            <h3 className="text-base md:text-lg font-medium text-center">Selecione um designer</h3>
            <p className="text-xs md:text-sm text-muted-foreground mt-1 text-center">
              Escolha um designer para visualizar suas artes em produção
            </p>
          </CardContent>
        </Card>
      )}

      {/* Content when designer is selected */}
      {activeDesignerId && (
        <>
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowAwaitingApprovalModal(true)}
            >
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6 pb-3 md:pb-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Aguard. Aprovação</p>
                    <p className="text-xl md:text-2xl font-black">{awaitingApprovalCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowPendingModal(true)}
            >
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6 pb-3 md:pb-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Clock className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Pendente</p>
                    <p className="text-xl md:text-2xl font-black">{pendingArtsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowApprovedModal(true)}
            >
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6 pb-3 md:pb-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Aprovadas</p>
                    <p className="text-xl md:text-2xl font-black">{approvedArtsCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              // Reuse pending modal for revisions or create a filter
              onClick={() => setShowPendingModal(true)}
            >
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6 pb-3 md:pb-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-2 rounded-full bg-rose-500/10">
                    <RotateCcw className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Alteração</p>
                    <p className="text-xl md:text-2xl font-black">{revisionRequestedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setShowDeletedModal(true)}
            >
              <CardContent className="pt-4 md:pt-6 px-3 md:px-6 pb-3 md:pb-6">
                <div className="flex flex-col items-center gap-1">
                  <div className="p-2 rounded-full bg-muted">
                    <Trash2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] md:text-xs text-muted-foreground uppercase font-bold">Excluídas</p>
                    <p className="text-xl md:text-2xl font-black">{deletedCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Instagram-style Art Cards */}
          {!isLoading && groupedArts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Palette className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">Nenhuma arte encontrada</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Não há artes registradas para este designer com os critérios selecionados
                </p>
              </CardContent>
            </Card>
          ) : !isLoading && (
            <div className="space-y-4">
              {groupedArts.map((group) => (
                <Collapsible key={group.client.id} defaultOpen={false}>
                  {/* Client Header - Collapsible Trigger */}
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent rounded-lg transition-colors group border bg-card mb-2">
                      {group.client.logo_url ? (
                        <img 
                          src={group.client.logo_url} 
                          alt={`Logo de ${group.client.name}`}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Palette className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h2 className="font-bold text-base">{group.client.name}</h2>
                          <Badge variant="secondary" className="text-[10px] h-4">
                            {group.arts.length} artes
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                          Clique para expandir e ver as artes
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1">
                          Ver Artes
                          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  {/* Instagram-style Cards Grid */}
                  <CollapsibleContent>
                    <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 pt-2 pb-6">
                    {group.arts.map((art) => {
                      // Get current images - prioritize uploaded, then final_art_urls, then legacy final_art_url
                      const currentUploadUrls = uploadUrls[art.id] || 
                        (art.final_art_urls?.length > 0 ? art.final_art_urls : 
                          (art.final_art_url ? [art.final_art_url] : []));
                      const hasImages = currentUploadUrls.length > 0;
                      const carouselBriefingImageUrls = getCarouselBriefingImageUrls(art);
                      const hasDownloadableImages = hasImages || carouselBriefingImageUrls.length > 0;
                      const hasRevision = art.status === 'revision_requested';
                      
                      return (
                        <Card 
                          key={art.id} 
                          className={`overflow-hidden transition-all hover:shadow-lg ${
                            hasRevision ? 'ring-2 ring-destructive' : ''
                          }`}
                          onClick={() => handleCardClick(art)}
                        >
                          {/* Square Image/Upload Area */}
                          <div className="relative aspect-square bg-muted">
                            {hasImages && !hasRevision ? (
                              <div className="relative w-full h-full group">
                                <ImageCarousel
                                  images={currentUploadUrls}
                                  onImageClick={(url) => setLightboxImage(url)}
                                  aspectRatio="square"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="pointer-events-auto shadow-md"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailArt(art);
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar / Ver Briefing
                                  </Button>
                                </div>
                              </div>
                            ) : hasRevision && hasImages ? (

                              /* When revision requested, show image with change button */
                              <div className="relative w-full h-full group">
                                <div className="w-full h-full opacity-60">
                                  <ImageCarousel
                                    images={currentUploadUrls}
                                    onImageClick={(url) => setLightboxImage(url)}
                                    aspectRatio="square"
                                  />
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDetailArt(art);
                                    }}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Alterar Imagem
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                                <MultiImageUpload
                                  bucket="final-arts"
                                  folder={`${art.work_month_id}/${art.id}`}
                                  currentUrls={[]}
                                  onUpload={(urls) => handleUpload(art, urls)}
                                  className="w-full h-full"
                                  maxImages={10}
                                />
                              </div>
                            )}
                            
                          {/* Status Badge Overlay */}
                            <div className="absolute top-2 left-2 z-10">
                              <Badge className={`${ART_STATUS_COLORS[art.status]} text-[10px] px-1.5 py-0.5 leading-tight`}>
                                {ART_STATUS_LABELS[art.status]}
                              </Badge>
                            </div>

                            {/* Art Number Badge */}
                            <div className="absolute top-2 right-2 z-10">
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 leading-tight">
                                #{art.art_number}
                              </Badge>
                            </div>
                          </div>

                          {/* Info Section - Compact */}
                          <CardContent className="p-2 space-y-1.5">
                            {/* Revision Alert */}
                            {hasRevision && art.revision_comment && (
                              <div className="bg-destructive/10 border border-destructive/30 rounded p-1.5">
                                <p className="text-[10px] text-destructive font-bold uppercase flex items-center gap-1">
                                  <RotateCcw className="h-2.5 w-2.5 shrink-0" />
                                  Alteração
                                </p>
                                <p className="text-[11px] text-destructive mt-0.5 line-clamp-2">{art.revision_comment}</p>
                              </div>
                            )}

                            {/* Deadline tracking */}
                            {(art as any).briefing_completed_at && ['ready_for_production', 'in_production'].includes(art.status) && (() => {
                              const deadline = addHours(new Date((art as any).briefing_completed_at), maxHoursPerArt);
                              const hoursLeft = differenceInHours(deadline, new Date());
                              const isOverdue = isPast(deadline);
                              return (
                                <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${isOverdue ? 'bg-destructive/10 text-destructive' : hoursLeft <= 12 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                                  {isOverdue ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                                  {isOverdue ? `Atrasada ${formatDistanceToNow(deadline, { locale: ptBR })}` : `${hoursLeft}h restantes`}
                                </div>
                              );
                            })()}

                            <div className="min-w-0">
                              <p className="font-medium text-xs truncate">
                                {art.title || 'Sem título'}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                                {art.art_type ? ART_TYPE_LABELS[art.art_type] : 'Tipo não definido'}
                                {art.art_type === 'carrossel' && art.carousel_slides && (
                                  <Badge variant="outline" className="text-[8px] h-3 px-1">
                                    {art.carousel_slides.length} cards
                                  </Badge>
                                )}
                              </p>
                            </div>

                            {/* Action Buttons - Compact */}
                            <div className="flex items-center gap-1">
                              {hasDownloadableImages && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2 text-[10px]"
                                  title={hasImages ? 'Baixar artes finais' : 'Baixar imagens do carrossel'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (hasImages) {
                                      handleDownloadImages(art);
                                    } else {
                                      handleDownloadCarouselBriefingImages(art);
                                    }
                                  }}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-7 text-[10px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailArt(art);
                                }}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Ver
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteArt(art);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
        showEditButton
        onEdit={() => {
          setLightboxImage(null);
        }}
      />

      {/* Art Detail Dialog */}
      <ArtDetailDialog
        art={detailArt}
        isOpen={!!detailArt}
        onClose={() => setDetailArt(null)}
        onUpload={(urls) => {
          if (detailArt) {
            handleUpload(detailArt, urls);
          }
        }}
        onDownloadPDF={handleDownloadPDF}
        showUpload
        currentUploadUrls={detailArt ? (uploadUrls[detailArt.id] || 
          (detailArt.final_art_urls?.length > 0 ? detailArt.final_art_urls : 
            (detailArt.final_art_url ? [detailArt.final_art_url] : []))) : []}
      />

      {/* Pending Arts Modal */}
      <Dialog open={showPendingModal} onOpenChange={setShowPendingModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Artes Pendentes - {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {arts?.filter(a => ['ready_for_production', 'in_production', 'revision_requested'].includes(a.status)).map((art) => {
              const artUrls = art.final_art_urls?.length > 0 
                ? art.final_art_urls 
                : (art.final_art_url ? [art.final_art_url] : []);
              const hasImages = artUrls.length > 0;
              
              return (
                <Card 
                  key={art.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setShowPendingModal(false);
                    setDetailArt(art);
                  }}
                >
                  <div className="relative aspect-square bg-muted">
                    {hasImages ? (
                      <img 
                        src={artUrls[0]} 
                        alt={art.title || `Arte ${art.art_number}`} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width="400"
                        height="400"
                      />
                    ) : art.reference_image_url ? (
                      <img 
                        src={art.reference_image_url} 
                        alt={`Referência para a arte ${art.art_number}`} 
                        className="w-full h-full object-cover opacity-60"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className={`${ART_STATUS_COLORS[art.status]} text-xs`}>
                        {ART_STATUS_LABELS[art.status]}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant="secondary" className="text-xs">#{art.art_number}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="font-medium text-sm truncate">{art.title || 'Sem título'}</p>
                    <p className="text-xs text-muted-foreground truncate">{art.work_month.client.name}</p>
                  </CardContent>
                </Card>
              );
            })}
            {pendingArtsCount === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhuma arte pendente este mês
              </div>
            )}
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Awaiting Approval Modal */}
      <Dialog open={showAwaitingApprovalModal} onOpenChange={setShowAwaitingApprovalModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Artes Aguardando Aprovação
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {arts?.filter(a => a.status === 'awaiting_approval').map((art) => {
              const artUrls = art.final_art_urls?.length > 0 ? art.final_art_urls : (art.final_art_url ? [art.final_art_url] : []);
              return (
                <Card key={art.id} className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow" onClick={() => { setShowAwaitingApprovalModal(false); setDetailArt(art); }}>
                  <div className="relative aspect-square bg-muted">
                    {artUrls.length > 0 ? <img src={artUrls[0]} alt={art.title || `Arte ${art.art_number}`} className="w-full h-full object-cover" /> : <div className="absolute inset-0 flex items-center justify-center"><ImageIcon className="h-12 w-12 text-muted-foreground/30" aria-hidden="true" /></div>}
                    <div className="absolute top-2 left-2 z-10"><Badge className={`${ART_STATUS_COLORS[art.status]} text-xs`}>{ART_STATUS_LABELS[art.status]}</Badge></div>
                  </div>
                  <CardContent className="p-2">
                    <p className="font-medium text-sm truncate">{art.title || 'Sem título'}</p>
                    <p className="text-xs text-muted-foreground truncate">{art.work_month.client.name}</p>
                  </CardContent>
                </Card>
              );
            })}
            {awaitingApprovalCount === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">Nenhuma arte aguardando aprovação</div>}
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <Dialog open={showApprovedModal} onOpenChange={setShowApprovedModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Artes Aprovadas - {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
            {arts?.filter(a => a.status === 'approved' && a.work_month.month === currentMonth && a.work_month.year === currentYear).map((art) => {
              const artUrls = art.final_art_urls?.length > 0 
                ? art.final_art_urls 
                : (art.final_art_url ? [art.final_art_url] : []);
              const hasImages = artUrls.length > 0;
              
              return (
                <Card 
                  key={art.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => {
                    setShowApprovedModal(false);
                    setDetailArt(art);
                  }}
                >
                  <div className="relative aspect-square bg-muted">
                    {hasImages ? (
                      <img 
                        src={artUrls[0]} 
                        alt={art.title || `Arte aprovada ${art.art_number}`} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        width="400"
                        height="400"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-green-500 text-white text-xs">Aprovada</Badge>
                    </div>
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant="secondary" className="text-xs">#{art.art_number}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-2">
                    <p className="font-medium text-sm truncate">{art.title || 'Sem título'}</p>
                    <p className="text-xs text-muted-foreground truncate">{art.work_month.client.name}</p>
                  </CardContent>
                </Card>
              );
            })}
            {approvedArtsCount === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhuma arte aprovada este mês
              </div>
            )}
          </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Deleted Arts Modal */}
      <Dialog open={showDeletedModal} onOpenChange={setShowDeletedModal}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Lixeira de Artes
            </DialogTitle>
            <DialogDescription>Visualize e restaure artes que foram excluídas.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              {deletedArts?.map(art => (
                <Card key={art.id} className="overflow-hidden bg-muted/30">
                  <div className="relative aspect-square grayscale opacity-60">
                    <div className="absolute inset-0 flex items-center justify-center"><Trash2 className="h-12 w-12 text-muted-foreground/30" /></div>
                  </div>
                  <CardContent className="p-2 space-y-2">
                    <p className="font-medium text-sm truncate line-through">{art.work_month.client.name} - #{art.art_number}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full h-8 text-xs"
                      onClick={() => restoreArtMutation.mutate(art.id)}
                      disabled={restoreArtMutation.isPending}
                    >
                      {restoreArtMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                      Restaurar
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {deletedCount === 0 && <div className="col-span-full text-center py-8 text-muted-foreground italic">A lixeira está vazia</div>}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteArt} onOpenChange={(open) => !open && setDeleteArt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta arte será movida para a lixeira e não aparecerá mais no seu painel de produção, mas poderá ser restaurada depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteArt && deleteArtMutation.mutate(deleteArt.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteArtMutation.isPending}
            >
              {deleteArtMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Mover para Lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteArt} onOpenChange={(open) => !open && setDeleteArt(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta arte será movida para a lixeira e não aparecerá mais no seu painel de produção, mas poderá ser restaurada depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteArt && deleteArtMutation.mutate(deleteArt.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteArtMutation.isPending}
            >
              {deleteArtMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Mover para Lixeira
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Design Dialog */}
      <Dialog open={showAddDesignDialog} onOpenChange={(open) => {
        setShowAddDesignDialog(open);
        if (!open) {
          setNewDesignClientId('');
          setNewDesignType('post_instagram');
          setNewDesignUploadUrls([]);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Adicionar Design
            </DialogTitle>
            <DialogDescription>
              Selecione o cliente e faça upload da arte
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={newDesignClientId} onValueChange={setNewDesignClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {designerClients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Arte</Label>
              <Select value={newDesignType} onValueChange={setNewDesignType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="post_instagram">Post Instagram</SelectItem>
                  <SelectItem value="story">Story</SelectItem>
                  <SelectItem value="carrossel">Carrossel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newDesignClientId && (
              <div className="space-y-2">
                <Label>Imagens da Arte</Label>
                <MultiImageUpload
                  bucket="final-arts"
                  folder={`new-design/${newDesignClientId}`}
                  currentUrls={newDesignUploadUrls}
                  onUpload={setNewDesignUploadUrls}
                  maxImages={10}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDesignDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createArtMutation.mutate({
                clientId: newDesignClientId,
                artType: newDesignType,
                uploadUrls: newDesignUploadUrls,
              })}
              disabled={!newDesignClientId || createArtMutation.isPending}
              className="gap-2"
            >
              {createArtMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
