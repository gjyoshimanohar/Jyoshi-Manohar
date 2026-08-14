import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../utils/seoSchemas';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string | string[];
  canonical?: string;
  ogType?: 'website' | 'article' | 'profile';
  ogImage?: string;
  ogImageAlt?: string;
  author?: string;
  noindex?: boolean;
  schemas?: object | object[];
}

export default function SEO({
  title,
  description = "Official portal of CA Jyoshi Manohar. Offering expert personal taxation, corporate auditing, financial advisory, GST compliance, international taxation, and Virtual CFO services.",
  keywords = ["CA Jyoshi Manohar", "Chartered Accountant", "Tax Consultant", "Audit Services", "GST Planning", "Financial Advisory", "Virtual CFO", "International Tax"],
  canonical,
  ogType = 'website',
  ogImage,
  ogImageAlt = 'CA Jyoshi Manohar | Chartered Accountant',
  author = 'CA Jyoshi Manohar',
  noindex = false,
  schemas = []
}: SEOProps) {
  const location = useLocation();

  // Full formatted page title
  const formattedTitle = title 
    ? (title.includes('CA Jyoshi Manohar') ? title : `${title} | CA Jyoshi Manohar`)
    : SITE_NAME;

  // Compute canonical URL dynamically if not explicitly provided
  const computedCanonical = canonical 
    ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`)
    : `${SITE_URL}${location.pathname}${location.search}`;

  // Image URL fallback
  const resolvedOgImage = ogImage 
    ? (ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`)
    : DEFAULT_OG_IMAGE;

  // Process keywords array vs string
  const formattedKeywords = Array.isArray(keywords) ? keywords.join(', ') : keywords;

  // Normalize schemas into an array
  const schemaList = Array.isArray(schemas) ? schemas.filter(Boolean) : [schemas].filter(Boolean);

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{formattedTitle}</title>
      <meta name="description" content={description} />
      {formattedKeywords && <meta name="keywords" content={formattedKeywords} />}
      <meta name="author" content={author} />

      {/* Dynamic Canonical Link */}
      <link rel="canonical" href={computedCanonical} />

      {/* Robots Tag */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook / LinkedIn */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="CA Jyoshi Manohar & Associates" />
      <meta property="og:title" content={formattedTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={computedCanonical} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:image:alt" content={ogImageAlt} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@cajyoshimanohar" />
      <meta name="twitter:creator" content="@cajyoshimanohar" />
      <meta name="twitter:title" content={formattedTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {/* Structured JSON-LD Schema Markup */}
      {schemaList.map((schemaObj, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schemaObj)}
        </script>
      ))}
    </Helmet>
  );
}
