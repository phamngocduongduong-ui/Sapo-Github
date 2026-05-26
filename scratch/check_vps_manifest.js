const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected to VPS.');
  
  const cmd = `
    echo "=== BUILD ID ==="
    cat /var/www/sapo-ems/.next/BUILD_ID
    echo "=== Manifest snippet ==="
    grep -A 5 -i "dk/page" /var/www/sapo-ems/.next/app-build-manifest.json || true
    echo "=== Check if JS file has branch or Nhà máy on VPS filesystem ==="
    find /var/www/sapo-ems/.next/ -name "*page-*.js" -path "*/dk/*" -exec grep -l "Nhà máy" {} \\; || true
    find /var/www/sapo-ems/.next/ -name "*page-*.js" -path "*/dk/*" -exec grep -l "branch" {} \\; || true
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d));
  }).on('data', (d) => process.stdout.write(d));
}).connect(config);
