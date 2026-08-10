import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Eye, Loader2, FileDown, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface BriefingImageViewerProps {
  images: string[];
  title: string;
  description?: string;
  artNumber?: number;
  clientName?: string;
  onImageClick?: (url: string) => void;
}

export function BriefingImageViewer({ 
  images, 
  title, 
  description,
  artNumber,
  clientName,
  onImageClick 
}: BriefingImageViewerProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadImage = async (url: string, index: number) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `referencia-${index + 1}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  const generateBriefingPDF = async () => {
    const { buildStandardPdfHtml, exportHtmlToPdf, pdfColoredSection } = await import('@/lib/pdfUtils');

    let body = '';
    body += pdfColoredSection('Título', title || 'Sem título', '#6366f1', '#eef2ff');
    if (description) {
      body += pdfColoredSection('Descrição / Orientações', description, '#3b82f6', '#eff6ff');
    }
    body += pdfColoredSection('Imagens de Referência', `${images.length} imagem(ns) anexada(s) - Veja os arquivos baixados separadamente`, '#8b5cf6', '#faf5ff');

    const htmlContent = buildStandardPdfHtml({
      title: 'Briefing de Arte',
      subtitle: artNumber ? `Arte #${artNumber}` : undefined,
      clientName: clientName || undefined,
      body,
    });

    await exportHtmlToPdf(htmlContent, `briefing-arte-${artNumber || 'ref'}.pdf`);
  };

  const downloadAllAndPDF = async () => {
    setIsDownloading(true);
    try {
      // Download all images
      for (let i = 0; i < images.length; i++) {
        await downloadImage(images[i], i);
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Generate and download PDF
      await generateBriefingPDF();
      
      toast.success('Tudo baixado com sucesso!');
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Erro ao baixar arquivos');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">Nenhuma imagem de referência</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {images.map((url, i) => (
          <Card key={i} className="group relative overflow-hidden">
            <CardContent className="p-0">
              <img 
                src={url} 
                alt={`Referência ${i + 1}`}
                className="w-full aspect-square object-cover cursor-pointer transition-transform hover:scale-105"
                onClick={() => onImageClick?.(url)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageClick?.(url);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(url, i);
                  }}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Button 
        onClick={downloadAllAndPDF} 
        disabled={isDownloading}
        className="w-full gap-2"
        variant="outline"
      >
        {isDownloading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="h-4 w-4" />
        )}
        Baixar Tudo (Imagens + PDF)
      </Button>
    </div>
  );
}
