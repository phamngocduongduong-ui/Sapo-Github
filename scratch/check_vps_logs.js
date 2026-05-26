const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected. Fetching PM2 logs...');
  conn.exec('export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh" && pm2 logs sapo-ems --lines 50 --err --no-color', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data);
    }).stderr.on('data', (data) => {
      process.stderr.write(data);
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect(config);
