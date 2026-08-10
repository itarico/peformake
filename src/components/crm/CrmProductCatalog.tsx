import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Trash2, Loader2, Edit2, ImageIcon, Upload, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface Props { clientId: string; }

export default function CrmProductCatalog({ clientId }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', category: '', image_url: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const loadProducts = async () => {
    const { data } = await supabase.from('client_products').select('*').eq('client_id', clientId).order('created_at');
    setProducts(data || []);
    setLoading(false);
  };

  useEffect(() => { loadProducts(); }, [clientId]);

  const openForm = (product?: any) => {
    if (product) {
      setEditing(product);
      setForm({ name: product.name, description: product.description || '', price: String(product.price || ''), category: product.category || '', image_url: product.image_url || '' });
    } else {
      setEditing(null);
      setForm({ name: '', description: '', price: '', category: '', image_url: '' });
    }
    setShowForm(true);
  };

  const saveProduct = async () => {
    if (!form.name.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    const payload = {
      client_id: clientId, name: form.name.trim(), description: form.description.trim() || null,
      price: form.price ? parseFloat(form.price) : null, category: form.category.trim() || null,
      image_url: form.image_url || null, is_active: true,
    };
    if (editing) {
      await supabase.from('client_products').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('client_products').insert(payload);
    }
    toast.success(editing ? 'Produto atualizado!' : 'Produto cadastrado!');
    setShowForm(false);
    loadProducts();
    setSaving(false);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Excluir este produto?')) return;
    await supabase.from('client_products').delete().eq('id', id);
    toast.success('Produto removido');
    loadProducts();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `products/${clientId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('crm-media').upload(path, file, { contentType: file.type });
    if (error) { toast.error('Erro no upload'); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('crm-media').getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  // CSV import
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const text = await file.text();
    parseAndImport(text);
  };

  const parseAndImport = async (text: string) => {
    setImporting(true);
    try {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('Arquivo vazio ou sem dados'); setImporting(false); return; }

      const headers = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/"/g, ''));
      const nameIdx = headers.findIndex(h => ['nome', 'name', 'produto', 'product'].includes(h));
      const priceIdx = headers.findIndex(h => ['preco', 'preço', 'price', 'valor'].includes(h));
      const descIdx = headers.findIndex(h => ['descricao', 'descrição', 'description', 'desc'].includes(h));
      const catIdx = headers.findIndex(h => ['categoria', 'category', 'cat'].includes(h));
      const imgIdx = headers.findIndex(h => ['imagem', 'image', 'image_url', 'foto', 'url'].includes(h));

      if (nameIdx === -1) { toast.error('Coluna "nome" não encontrada no CSV'); setImporting(false); return; }

      const products: any[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIdx]?.trim();
        if (!name) continue;
        products.push({
          client_id: clientId,
          name,
          price: priceIdx >= 0 ? parseFloat(cols[priceIdx]?.replace(',', '.') || '0') || null : null,
          description: descIdx >= 0 ? cols[descIdx] || null : null,
          category: catIdx >= 0 ? cols[catIdx] || null : null,
          image_url: imgIdx >= 0 ? cols[imgIdx] || null : null,
          is_active: true,
        });
      }

      if (products.length === 0) { toast.error('Nenhum produto válido encontrado'); setImporting(false); return; }

      const { error } = await supabase.from('client_products').insert(products);
      if (error) throw error;
      toast.success(`${products.length} produto(s) importado(s)!`);
      setShowImport(false);
      setImportText('');
      loadProducts();
    } catch (err: any) {
      toast.error('Erro na importação: ' + (err.message || 'tente novamente'));
    }
    setImporting(false);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Catálogo de Produtos</h3>
          <Badge variant="secondary" className="text-[10px]">{products.length}</Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setShowImport(true)}>
            <Upload className="h-3.5 w-3.5" /> Importar
          </Button>
          <Button size="sm" className="gap-1 text-xs" onClick={() => openForm()}>
            <Plus className="h-3.5 w-3.5" /> Produto
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card><CardContent className="py-8 text-center">
          <Package className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cadastre produtos para usar no chat e bot.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.map(p => (
            <Card key={p.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex gap-3 p-3">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-16 w-16 rounded-lg object-cover shrink-0 border" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {p.description && <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>}
                    {p.price && (
                      <p className="text-sm font-semibold text-primary mt-1">
                        R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {p.category && <Badge variant="secondary" className="text-[9px] mt-1">{p.category}</Badge>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openForm(p)}>
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => deleteProduct(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Product form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do produto" />
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição" className="min-h-[60px]" />
            <div className="flex gap-2">
              <Input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="Preço" type="number" step="0.01" />
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Categoria" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Imagem do produto</label>
              {form.image_url && <img src={form.image_url} alt="preview" className="h-20 w-20 rounded-lg object-cover mb-2 border" />}
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  <Button size="sm" variant="outline" className="text-xs gap-1 pointer-events-none" asChild>
                    <span>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImageIcon className="h-3 w-3" />} {form.image_url ? 'Trocar' : 'Upload'}</span>
                  </Button>
                </label>
                {form.image_url && (
                  <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => setForm(f => ({ ...f, image_url: '' }))}>
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <Button className="w-full" onClick={saveProduct} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" /> Importar Produtos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Faça upload de um arquivo CSV ou cole os dados abaixo. O arquivo deve conter pelo menos a coluna <strong>nome</strong>. Colunas opcionais: preço, descrição, categoria, imagem.
            </p>
            <div className="flex gap-2">
              <input ref={csvInputRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={handleCSVImport} />
              <Button variant="outline" onClick={() => csvInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Upload CSV
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">Ou cole os dados (CSV com separador vírgula, ponto-e-vírgula ou tab):</div>
            <Textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder={"nome;preço;descrição;categoria\nProduto A;99.90;Descrição do produto;Categoria\nProduto B;149.00;;"}
              className="min-h-[120px] text-xs font-mono"
            />
            <Button className="w-full" onClick={() => parseAndImport(importText)} disabled={importing || !importText.trim()}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Importar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
