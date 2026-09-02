import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const urlPath = req.url.split('?')[0];
  const searchParams = new URL(req.url, 'http://localhost').searchParams;
  const apiBase = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
  
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'rwanmart.com';
  const baseUrl = `${protocol}://${host}`;

  let html = '';
  try {
    const indexRes = await fetch(`${baseUrl}/index.html`);
    if (!indexRes.ok) throw new Error(`HTTP error ${indexRes.status}`);
    html = await indexRes.text();
  } catch (err) {
    console.error('Failed to fetch index.html from edge', err);
    return res.status(500).send('Internal Server Error: Missing SPA shell');
  }

  let statusCode = 200;
  let seoTitle = 'RwanMart | Buy & Sell Online in Rwanda';
  let seoDescription = 'RwanMart is an online marketplace in Rwanda where people can buy and sell products and discover local sellers.';
  let ogImage = 'https://rwanmart.com/favicon.png';
  let jsonLd = '';
  let bodyHtml = '';

  try {
    // ROUTE: /listing/:id
    if (urlPath.startsWith('/listing/')) {
      const id = urlPath.split('/')[2];
      if (id) {
        const listingRes = await fetch(`${apiBase}/listings/${id}`);
        if (!listingRes.ok) {
          statusCode = 404;
          seoTitle = 'Listing Not Found | RwanMart';
          bodyHtml = `<h1>Listing Not Found</h1><p>The product you are looking for does not exist or has been removed.</p><a href="/browse">Browse other items</a>`;
        } else {
          const data = await listingRes.json();
          const listing = data.data || data;
          
          seoTitle = `${listing.title} for Sale in Rwanda | RwanMart`;
          seoDescription = listing.description || `Buy ${listing.title} on RwanMart.`;
          ogImage = (listing.images && listing.images.length > 0) ? listing.images[0] : ogImage;
          
          const productSchema = {
            "@context": "https://schema.org",
            "@type": "Product",
            "name": listing.title,
            "image": [ogImage],
            "description": seoDescription,
            "offers": {
              "@type": "Offer",
              "priceCurrency": "RWF",
              "price": listing.price,
              "availability": "https://schema.org/InStock",
              "url": `https://rwanmart.com/listing/${id}`
            }
          };
          jsonLd = `<script type="application/ld+json">${JSON.stringify(productSchema)}</script>`;
          
          bodyHtml = `
            <div id="seo-content">
              <h1>${listing.title}</h1>
              <img src="${ogImage}" alt="${listing.title}" />
              <p>Price: ${listing.price} RWF</p>
              <p>${seoDescription}</p>
              <a href="/browse">View more listings on RwanMart</a>
            </div>
          `;
        }
      }
    }
    
    // ROUTE: /seller/:id
    else if (urlPath.startsWith('/seller/')) {
      const id = urlPath.split('/')[2];
      if (id) {
        const sellerRes = await fetch(`${apiBase}/users/${id}/public`);
        if (!sellerRes.ok) {
          statusCode = 404;
          seoTitle = 'Seller Not Found | RwanMart';
        } else {
          const data = await sellerRes.json();
          const seller = data.data || data;
          
          seoTitle = seller.full_name ? `Listings by ${seller.full_name} | RwanMart` : 'Seller Profile | RwanMart';
          seoDescription = `View products and listings by ${seller.full_name || 'this seller'} on RwanMart.`;
          ogImage = seller.profile_image_path || seller.avatar_url || ogImage;
          
          const profileSchema = {
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            "mainEntity": {
              "@type": "Person",
              "name": seller.full_name || "Anonymous Seller",
              "image": ogImage
            }
          };
          jsonLd = `<script type="application/ld+json">${JSON.stringify(profileSchema)}</script>`;
          
          bodyHtml = `
            <div id="seo-content">
              <h1>Listings by ${seller.full_name || 'Seller'}</h1>
              <p>${seoDescription}</p>
              <a href="/browse">Return to marketplace</a>
            </div>
          `;
        }
      }
    }

    // ROUTE: /browse
    else if (urlPath === '/browse') {
      const categoryId = searchParams.get('category');
      if (categoryId) {
        const catRes = await fetch(`${apiBase}/categories`);
        if (catRes.ok) {
          const catData = await catRes.json();
          const categories = catData.data || [];
          const category = categories.find(c => c.id === categoryId);
          if (category) {
            seoTitle = `${category.label} for Sale in Rwanda | RwanMart`;
            seoDescription = `Discover great deals on ${category.label.toLowerCase()} across Rwanda on RwanMart.`;
            
            const collectionSchema = {
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": seoTitle,
              "description": seoDescription,
              "url": `https://rwanmart.com/browse?category=${categoryId}`
            };
            jsonLd = `<script type="application/ld+json">${JSON.stringify(collectionSchema)}</script>`;
            
            bodyHtml = `
              <div id="seo-content">
                <h1>${category.label} for Sale in Rwanda</h1>
                <p>${seoDescription}</p>
                <a href="/">Go to RwanMart Homepage</a>
              </div>
            `;
          }
        }
      }
    }
  } catch (err) {
    console.error('Render fallback error:', err);
    // Ignore errors and just serve the base HTML
  }

  // Inject meta tags into the <head>
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${seoTitle}</title>`
  );

  // Replace default descriptions and OG tags if we have dynamic ones
  if (seoTitle !== 'RwanMart | Buy & Sell Online in Rwanda') {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${seoDescription}" />`
    );
    html = html.replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${seoTitle}" />`
    );
    html = html.replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${seoDescription}" />`
    );
    // Remove existing og:image if it exists so we can add our own cleanly
    html = html.replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/g, '');
    html = html.replace(
      '</head>',
      `  <meta property="og:image" content="${ogImage}" />\n${jsonLd}\n</head>`
    );
  }

  // Inject semantic HTML into the <body> for crawlers
  if (bodyHtml) {
    html = html.replace(
      /<div id="root"><\/div>/,
      `<noscript>${bodyHtml}</noscript>\n    <div id="root"></div>`
    );
  }

  // If 404, we add noindex
  if (statusCode === 404) {
    html = html.replace(
      '</head>',
      `  <meta name="robots" content="noindex, follow" />\n</head>`
    );
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cache the response at the edge for 1 minute, allow stale content while revalidating
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  res.status(statusCode).send(html);
}
