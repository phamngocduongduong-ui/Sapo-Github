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
      
      async function run() {
        const user = await prisma.user.findUnique({
          where: { username: 'admin' },
          select: { username: true, role: true, employeeName: true, branch: true }
        });
        console.log('User object:', user);
        
        const activeBranches = (await prisma.branch.findMany({
          where: { status: 'ACTIVE' },
          select: { name: true }
        })).map(b => b.name);
        console.log('Active branches:', activeBranches);
        
        const userBranches = user.branch 
          ? user.branch.split(',').map(b => b.trim()).filter(Boolean).filter(b => activeBranches.includes(b))
          : [];
        console.log('User branches (filtered):', userBranches);
        
        const allowed = userBranches.length > 0 ? userBranches : activeBranches;
        console.log('Allowed branches:', allowed);
      }
      
      run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
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
