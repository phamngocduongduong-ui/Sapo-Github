const https = require('https');

// We parse the HTML first to find the exact chunk name
const htmlUrl = 'https://ems.sapodaklak.com/dk?token=sapo-gate-secure-token-2026';

https.get(htmlUrl, (res) => {
  let html = '';
  res.on('data', (c) => html += c);
  res.on('end', () => {
    // Find script src for app/dk/page
    const match = html.match(/src="(\/_next\/static\/chunks\/app\/dk\/page-[^"]+)"/);
    if (!match) {
      console.error('Could not find app/dk/page chunk script tag in HTML!');
      return;
    }
    const chunkPath = match[1];
    const chunkUrl = `https://ems.sapodaklak.com${chunkPath}`;
    console.log('Found chunk URL:', chunkUrl);
    
    https.get(chunkUrl, (chunkRes) => {
      let js = '';
      chunkRes.on('data', (c) => js += c);
      chunkRes.on('end', () => {
        const containsNhàMáy = js.includes('Nhà máy');
        const containsBranch = js.includes('branch');
        console.log('Does JS chunk contain "Nhà máy"?', containsNhàMáy);
        console.log('Does JS chunk contain "branch"?', containsBranch);
        
        // Print where it is found if present
        if (containsNhàMáy) {
          const index = js.indexOf('Nhà máy');
          console.log('Snippet around "Nhà máy":', js.slice(index - 50, index + 150));
        }
      });
    });
  });
});
