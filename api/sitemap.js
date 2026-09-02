export default async function handler(req, res) {
  const baseUrl = 'https://rwanmart.com';
  let urls = [
    { loc: `${baseUrl}/`, priority: '1.0' },
    { loc: `${baseUrl}/browse`, priority: '0.9' },
  ];

  try {
    const apiBase = process.env.VITE_API_BASE_URL || process.env.API_BASE_URL;
    
    if (apiBase) {
      // Fetch categories
      const categoriesRes = await fetch(`${apiBase}/categories`);
      if (categoriesRes.ok) {
        const catData = await categoriesRes.json();
        const categories = catData.data || [];
        categories.forEach(cat => {
          urls.push({ loc: `${baseUrl}/browse?category=${cat.id}`, priority: '0.8' });
        });
      }

      // Fetch top listings (limit to 500 for the dynamic sitemap)
      const listingsRes = await fetch(`${apiBase}/listings?limit=500&sort=newest`);
      if (listingsRes.ok) {
        const listData = await listingsRes.json();
        // Handle both pagination formats based on what API returns
        const listings = listData.data?.listings || listData.data || [];
        
        if (Array.isArray(listings)) {
          listings.forEach(listing => {
            urls.push({ loc: `${baseUrl}/listing/${listing.id}`, priority: '0.7' });
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching data for sitemap:', error);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>daily</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Cache for 1 hour
  res.status(200).send(sitemap);
}
