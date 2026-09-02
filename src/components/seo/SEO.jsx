import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title, // If passed, will be suffixed with " | RwanMart" (except for homepage if we handle it properly, but we'll manage it)
  description,
  canonicalUrl,
  ogType = 'website',
  ogImage = 'https://rwanmart.com/favicon.png',
  schemaList = [],
}) => {
  // If title exactly equals the homepage title, we don't append suffix
  const isHomeTitle = title === 'RwanMart | Buy & Sell Online in Rwanda';
  const fullTitle = isHomeTitle ? title : (title ? `${title} | RwanMart` : 'RwanMart | Buy & Sell Online in Rwanda');
  
  const defaultDescription = 'RwanMart is an online marketplace in Rwanda where people can buy and sell products and discover local sellers.';
  const finalDescription = description || defaultDescription;
  
  // Ensure the canonical URL always uses www
  const finalCanonicalUrl = canonicalUrl 
    ? (canonicalUrl.startsWith('http') ? canonicalUrl.replace(/^https?:\/\/(?:www\.)?rwanmart\.com/, 'https://rwanmart.com') : `https://rwanmart.com${canonicalUrl}`)
    : 'https://rwanmart.com/';

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={finalDescription} />
      <link rel="canonical" href={finalCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={finalCanonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="RwanMart" />
      <meta property="og:locale" content="en_RW" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={finalCanonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* Structured Data (JSON-LD) */}
      {schemaList.length > 0 &&
        schemaList.map((schema, index) => (
          <script key={index} type="application/ld+json">
            {JSON.stringify(schema)}
          </script>
        ))}
    </Helmet>
  );
};

export default SEO;
