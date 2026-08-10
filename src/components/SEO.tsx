import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  twitterHandle?: string;
  noindex?: boolean;
  structuredData?: object;
}

const SEO = ({
  title,
  description = "A Peformake é uma agência full-service especializada em transformar negócios através de Audiovisual, Marketing de Dados e Inteligência Artificial.",
  canonical,
  ogImage = "/og-image.png",
  ogType = "website",
  twitterHandle = "@performake",
  noindex = false,
  structuredData,
}: SEOProps) => {
  const siteName = "Peformake";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const url = window.location.href;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical Link */}
      <link rel="canonical" href={canonical || url} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content={siteName} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content={twitterHandle} />

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
