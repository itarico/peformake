import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface BulkDownloadButtonProps {
  arts: Array<{
    id: string;
    title: string | null;
    art_number: number;
    final_art_url: string | null;
    final_art_urls: string[];
  }>;
  clientName: string;
  monthLabel?: string;
}

export function BulkDownloadButton({ arts, clientName, monthLabel }: BulkDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Collect all image URLs from approved arts
  const allUrls: { url: string; filename: string }[] = [];
  arts.forEach((art) => {
    const urls = art.final_art_urls?.length > 0 
      ? art.final_art_urls 
      : art.final_art_url ? [art.final_art_url] : [];
    
    urls.forEach((url, idx) => {
      const ext = url.split('.').pop()?.split('?')[0] || 'png';
      const artName = art.title || `arte-${art.art_number}`;
      const safeName = artName.replace(/[^a-zA-Z0-9\-_]/g, '_').substring(0, 50);
      const suffix = urls.length > 1 ? `-${idx + 1}` : '';
      allUrls.push({ url, filename: `${safeName}${suffix}.${ext}` });
    });
  });

  const handleDownload = async () => {
    if (allUrls.length === 0) {
      toast.error('Nenhuma arte finalizada para download');
      return;
    }

    setIsDownloading(true);
    try {
      // Download images sequentially with small delays
      for (let i = 0; i < allUrls.length; i++) {
        const { url, filename } = allUrls[i];
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        
        // Small delay between downloads so browser doesn't block them
        if (i < allUrls.length - 1) {
          await new Promise(r => setTimeout(r, 300));
        }
      }
      toast.success(`${allUrls.length} arquivo(s) baixado(s)!`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar arquivos');
    } finally {
      setIsDownloading(false);
    }
  };

  if (allUrls.length === 0) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isDownloading}
      className="gap-2"
    >
      {isDownloading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Baixar Todas ({allUrls.length})
    </Button>
  );
}
