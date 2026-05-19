const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const conn = new Client();
conn.on('ready', () => {
  console.log('Connected to VPS.');
  const sql = `
    mysql -u root -e "CREATE DATABASE IF NOT EXISTS sapo_ems;"
    mysql -u root -e "CREATE USER IF NOT EXISTS 'sapo_user'@'localhost' IDENTIFIED WITH caching_sha2_password BY '5nOYlS6mTDuBF0GXk3Ih';"
    mysql -u root -e "ALTER USER 'sapo_user'@'localhost' IDENTIFIED WITH caching_sha2_password BY '5nOYlS6mTDuBF0GXk3Ih';"
    mysql -u root -e "GRANT ALL PRIVILEGES ON sapo_ems.* TO 'sapo_user'@'localhost';"
    mysql -u root -e "FLUSH PRIVILEGES;"
    mysql -u root -e "select user, host, plugin from mysql.user;"
  `;
  conn.exec(sql, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.end();
    }).on('data', (data) => {
      console.log(data.toString());
    }).stderr.on('data', (data) => {
      console.error(data.toString());
    });
  });
}).on('error', (err) => {
  console.error(err);
}).connect(config);
