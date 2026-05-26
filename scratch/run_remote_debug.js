const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const remoteDeployPath = '/var/www/sapo-ems';

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Ready');
  
  const cmd = `bash -c '
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
    cd ${remoteDeployPath}
    echo "=== NODE VERSION ==="
    node -v
    npm -v
    echo "=== NPM INSTALL ==="
    npm install
    echo "=== PRISMA GENERATE ==="
    npx prisma generate
    echo "=== PRISMA PUSH ==="
    npx prisma db push --accept-data-loss
    echo "=== NPM BUILD ==="
    NODE_OPTIONS="--max-old-space-size=1024" npm run build
  '`;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error('Exec error:', err);
      conn.end();
      return;
    }
    stream.on('close', (code) => {
      console.log(`Exit code: ${code}`);
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('Connection error:', err);
}).connect(config);
