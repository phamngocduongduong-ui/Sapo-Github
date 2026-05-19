const { Client } = require('ssh2');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

function runRemoteCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n--- RUNNING REMOTE COMMAND: ${cmd} ---`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code, signal) => {
        resolve({ code, stdout, stderr });
      }).on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data.toString());
      }).stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data.toString());
      });
    });
  });
}

async function main() {
  const conn = new Client();
  console.log('Connecting to VPS...');
  await new Promise((resolve, reject) => {
    conn.on('ready', resolve).on('error', reject).connect(config);
  });
  console.log('✔ Connected!\n');

  try {
    await runRemoteCommand(conn, 'cat /etc/nginx/sites-available/sapo-ems');
  } catch (err) {
    console.error(err);
  } finally {
    conn.end();
  }
}

main();
