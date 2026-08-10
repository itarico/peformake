import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { 
  Package, 
  Plus, 
  Trash2, 
  Edit2, 
  DollarSign, 
  Loader2,
  Upload,
  Download
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  cost: number | null;
  category: string | null;
  features: string | null;
  is_active: boolean;
}

interface ProductCatalogProps {
  clientId: string;
  disabled?: boolean;
}

export function ProductCatalog({ clientId, disabled }: ProductCatalogProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    category: '',
    features: '',
  });

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['client-products', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_products')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!clientId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const productData = {
        client_id: clientId,
        name: formData.name,
        description: formData.description || null,
        price: formData.price ? parseFloat(formData.price) : null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        category: formData.category || null,
        features: formData.features || null,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from('client_products')
          .update(productData)
          .eq('id', editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('client_products')
          .insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-products'] });
      toast.success(editingProduct ? 'Produto atualizado!' : 'Produto adicionado!');
      handleCloseDialog();
    },
    onError: () => {
      toast.error('Erro ao salvar produto');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('client_products')
        .update({ is_active: false })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-products'] });
      toast.success('Produto removido');
    },
    onError: () => {
      toast.error('Erro ao remover produto');
    },
  });

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || '',
        price: product.price?.toString() || '',
        cost: product.cost?.toString() || '',
        category: product.category || '',
        features: product.features || '',
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        cost: '',
        category: '',
        features: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      category: '',
      features: '',
    });
  };

  const handleExportCSV = () => {
    if (!products?.length) return;

    const headers = ['Nome', 'Categoria', 'Preço', 'Custo', 'Descrição', 'Características'];
    const rows = products.map(p => [
      p.name,
      p.category || '',
      p.price?.toString() || '',
      p.cost?.toString() || '',
      p.description || '',
      p.features || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'catalogo-produtos.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!');
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    // Skip header
    const dataLines = lines.slice(1);
    
    let imported = 0;
    for (const line of dataLines) {
      const cols = line.split(',').map(col => col.replace(/^"|"$/g, '').trim());
      if (cols[0]) {
        await supabase.from('client_products').insert({
          client_id: clientId,
          name: cols[0],
          category: cols[1] || null,
          price: cols[2] ? parseFloat(cols[2]) : null,
          cost: cols[3] ? parseFloat(cols[3]) : null,
          description: cols[4] || null,
          features: cols[5] || null,
        });
        imported++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['client-products'] });
    toast.success(`${imported} produtos importados!`);
    e.target.value = '';
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Group products by category
  const groupedProducts = products?.reduce((acc, product) => {
    const category = product.category || 'Sem categoria';
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>) || {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Catálogo de Produtos/Serviços
            </CardTitle>
            <CardDescription>
              {products?.length || 0} itens cadastrados
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImportCSV}
                disabled={disabled}
              />
              <Button variant="outline" size="sm" asChild disabled={disabled}>
                <span className="gap-2">
                  <Upload className="h-4 w-4" />
                  Importar CSV
                </span>
              </Button>
            </label>
            
            {products?.length ? (
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            ) : null}
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => handleOpenDialog()} disabled={disabled} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? 'Editar Produto' : 'Novo Produto/Serviço'}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome do produto ou serviço"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Categoria</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Ex: Serviços, Produtos, Pacotes..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price">Preço de Venda</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cost">Custo</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        value={formData.cost}
                        onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Breve descrição do produto ou serviço..."
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="features">Características/Diferenciais</Label>
                    <Textarea
                      id="features"
                      value={formData.features}
                      onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                      placeholder="Benefícios, diferenciais, o que inclui..."
                      rows={2}
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => saveMutation.mutate()} 
                    disabled={!formData.name || saveMutation.isPending}
                  >
                    {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingProduct ? 'Salvar' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !products?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Nenhum produto cadastrado</p>
            <p className="text-sm">Adicione produtos ou importe um CSV</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
              <div key={category}>
                <h3 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                  <Badge variant="outline">{category}</Badge>
                  <span className="text-xs">({categoryProducts.length})</span>
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto/Serviço</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">Margem</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryProducts.map((product) => {
                      const margin = product.price && product.cost 
                        ? ((product.price - product.cost) / product.price * 100).toFixed(1)
                        : null;
                      
                      return (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(product.price)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(product.cost)}
                          </TableCell>
                          <TableCell className="text-right">
                            {margin ? (
                              <Badge variant={parseFloat(margin) > 30 ? 'default' : 'secondary'}>
                                {margin}%
                              </Badge>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleOpenDialog(product)}
                                disabled={disabled}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => deleteMutation.mutate(product.id)}
                                disabled={disabled}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
