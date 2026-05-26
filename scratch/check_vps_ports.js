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
    echo "=== Ports listening on VPS ==="
    ss -tulnp | grep -E "3000|80|443" || true
    echo "=== PM2 show sapo-ems ==="
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
    pm2 show sapo-ems || true
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d));
  }).on('data', (d) => process.stdout.write(d));
}).connect(config);
