import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ServiceCatalog } from '@/features/catalog/ServiceCatalog'
import { EllcazoHeader } from './AvBoard'

/** Produtos e serviços da Ellcazo (audiovisual), com a identidade da produtora. */
export function AvCatalogPage() {
  return (
    <div className="theme-ellcazo flex flex-col gap-4">
      <Link to="/audiovisual" className="inline-flex min-h-10 items-center gap-1.5 self-start text-[14px] font-medium"><ArrowLeft size={16} aria-hidden="true" /> Produções</Link>
      <EllcazoHeader sub="Serviços, entregas e preços base da produtora.">Produtos e serviços</EllcazoHeader>
      <ServiceCatalog area="audiovisual" />
    </div>
  )
}
