export const SITE_URL = 'https://jyoshimanohar.com';
export const SITE_NAME = 'CA Jyoshi Manohar | Chartered Accountant';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.svg`;

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AccountingService',
    '@id': `${SITE_URL}/#organization`,
    name: 'CA Jyoshi Manohar & Associates',
    alternateName: 'CA Jyoshi Manohar Chartered Accountant',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    image: `${SITE_URL}/profile.png`,
    description: 'Premier Chartered Accountancy firm providing expert personal taxation, corporate auditing, GST compliance, international taxation, startup CFO advisory, and financial governance.',
    telephone: '+91-9876543210',
    email: 'contact@jyoshimanohar.com',
    priceRange: '₹₹₹ / $$$',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Bengaluru',
      addressRegion: 'Karnataka',
      postalCode: '560001',
      addressCountry: 'IN'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 12.9716,
      longitude: 77.5946
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '18:30'
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Saturday'],
        opens: '10:00',
        closes: '14:00'
      }
    ],
    sameAs: [
      'https://linkedin.com/in/cajyoshimanohar',
      'https://twitter.com/cajyoshimanohar',
      'https://facebook.com/cajyoshimanohar'
    ],
    knowsAbout: [
      'Chartered Accountancy',
      'Tax Planning & Advisory',
      'Statutory & Internal Auditing',
      'GST Compliance',
      'International Transfer Pricing',
      'Virtual CFO Services',
      'Startup Valuation & M&A'
    ]
  };
}

export function getPersonSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE_URL}/#person`,
    name: 'CA Jyoshi Manohar',
    jobTitle: 'Chartered Accountant & Founder',
    worksFor: {
      '@type': 'AccountingService',
      name: 'CA Jyoshi Manohar & Associates'
    },
    image: `${SITE_URL}/profile.png`,
    url: SITE_URL,
    alumniOf: 'Institute of Chartered Accountants of India (ICAI)',
    knowsAbout: [
      'Income Tax Law',
      'Corporate Finance',
      'GST & Indirect Taxes',
      'Cross-border Taxation',
      'Financial Modeling'
    ]
  };
}

export function getWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    description: 'Official digital portal for CA Jyoshi Manohar - Personal Tax, Corporate Advisory, Auditing, and Financial Tools.',
    publisher: {
      '@id': `${SITE_URL}/#organization`
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/blog?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function getArticleSchema(post: {
  title: string;
  excerpt?: string;
  content?: string;
  slug: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  author?: string;
  category?: string;
  imageUrl?: string;
}) {
  const publishedDate = post.createdAt || post.date || new Date().toISOString();
  const modifiedDate = post.updatedAt || publishedDate;
  const description = post.excerpt || (post.content ? post.content.replace(/<[^>]*>?/gm, '').substring(0, 160) : 'Financial insights by CA Jyoshi Manohar.');

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}/blog/${post.slug}#article`,
    headline: post.title,
    description,
    image: post.imageUrl ? (post.imageUrl.startsWith('http') ? post.imageUrl : `${SITE_URL}${post.imageUrl}`) : DEFAULT_OG_IMAGE,
    datePublished: publishedDate,
    dateModified: modifiedDate,
    author: {
      '@type': 'Person',
      name: post.author || 'CA Jyoshi Manohar',
      url: SITE_URL
    },
    publisher: {
      '@type': 'Organization',
      name: 'CA Jyoshi Manohar & Associates',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.svg`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`
    },
    articleSection: post.category || 'Financial Insights',
    inLanguage: 'en-US'
  };
}

export function getServiceSchema(service: {
  id: string;
  title: string;
  description: string;
  deliverables?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${SITE_URL}/services/${service.id}#service`,
    name: service.title,
    serviceType: service.title,
    description: service.description,
    provider: {
      '@type': 'AccountingService',
      name: 'CA Jyoshi Manohar & Associates',
      url: SITE_URL
    },
    areaServed: [
      {
        '@type': 'Country',
        name: 'India'
      },
      {
        '@type': 'Country',
        name: 'United States'
      },
      {
        '@type': 'Country',
        name: 'Global'
      }
    ],
    hasOfferCatalog: service.deliverables && service.deliverables.length > 0 ? {
      '@type': 'OfferCatalog',
      name: `${service.title} Key Services`,
      itemListElement: service.deliverables.map((item, index) => ({
        '@type': 'Offer',
        position: index + 1,
        itemOffered: {
          '@type': 'Service',
          name: item
        }
      }))
    } : undefined
  };
}

export function getToolkitSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${SITE_URL}/toolkit#webapp`,
    name: 'CA Financial & Tax Calculators Interactive Toolkit',
    operatingSystem: 'All Modern Web Browsers',
    applicationCategory: 'FinanceApplication',
    url: `${SITE_URL}/toolkit`,
    description: 'Suite of interactive financial tools: Income Tax Calculator, GST Estimator, Capital Gains Calculator, EMI Calculator, SIP Future Value Calculator, and Financial Ratios.',
    author: {
      '@type': 'Person',
      name: 'CA Jyoshi Manohar'
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock'
    }
  };
}

export function getBreadcrumbSchema(items: { label: string; to?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.to ? (item.to.startsWith('http') ? item.to : `${SITE_URL}${item.to}`) : undefined
    }))
  };
}
