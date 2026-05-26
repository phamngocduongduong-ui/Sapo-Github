const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready');
  const remoteCmd = `
    cd /var/www/sapo-ems
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    node -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.branch.findMany()
        .then(branches => {
          console.log('Branches on VPS:');
          console.log(JSON.stringify(branches, null, 2));
          process.exit(0);
        })
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
    "
  `;
  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).on('error', (err) => {
  console.error('SSH Error:', err);
}).connect(config);
