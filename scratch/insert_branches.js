const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected to VPS.');
  
  const mysqlCmd = `
    mysql -u sapo_user -p5nOYlS6mTDuBF0GXk3Ih sapo_ems -e "
      INSERT INTO branch (id, code, name, status, createdAt, updatedAt) 
      VALUES 
        ('branch_dt_cuid', 'DT', 'Đồng Tháp', 'ACTIVE', NOW(), NOW()),
        ('branch_dl_cuid', 'DL', 'Đắk Lắk', 'ACTIVE', NOW(), NOW())
      ON DUPLICATE KEY UPDATE status='ACTIVE';
    "
    echo "=== Current Branches ==="
    mysql -u sapo_user -p5nOYlS6mTDuBF0GXk3Ih sapo_ems -e "SELECT id, code, name, status FROM branch;"
  `;
  
  conn.exec(mysqlCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (d) => process.stdout.write(d));
  }).on('data', (d) => process.stdout.write(d));
}).connect(config);
