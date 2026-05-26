const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected to VPS.');
  
  // Search for the Vietnamese unicode characters of "Nhà máy" in JS chunks on VPS
  const cmd = `
    echo "=== Searching for 'Nhà máy' in JS chunks ==="
    grep -rn "Nhà máy" /var/www/sapo-ems/.next/static/chunks/ || true
    echo "=== Searching for 'branch' in JS chunks ==="
    grep -rn "branch" /var/www/sapo-ems/.next/static/chunks/ | head -n 30 || true
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d));
  }).on('data', (d) => process.stdout.write(d));
}).connect(config);
