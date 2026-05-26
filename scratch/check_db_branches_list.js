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
    echo "=== Branches in Database ==="
    mysql -u sapo_user -p5nOYlS6mTDuBF0GXk3Ih sapo_ems -e "SELECT * FROM branch;" || true
  `;
  
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d));
  }).on('data', (d) => process.stdout.write(d));
}).connect(config);
