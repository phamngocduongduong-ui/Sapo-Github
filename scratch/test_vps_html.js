const https = require('https');

const url = 'https://ems.sapodaklak.com/dk?token=sapo-gate-secure-token-2026';

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('Response Status:', res.statusCode);
    const hasBranchSelect = data.includes('Nhà máy *');
    const hasBranchOptions = data.includes('Đồng Tháp') && data.includes('Đắk Lắk') && data.includes('Hồ Chí Minh');
    console.log('Does HTML contain "Nhà máy *"?', hasBranchSelect);
    console.log('Does HTML contain branch options (Đồng Tháp, Đắk Lắk, Hồ Chí Minh)?', hasBranchOptions);
    if (!hasBranchSelect) {
      console.log('Snippet of HTML body around expected area (first 1000 chars):');
      console.log(data.slice(0, 1000));
    }
  });
}).on('error', (err) => {
  console.error('Error fetching page:', err);
});
