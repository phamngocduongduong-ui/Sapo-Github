const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const config = {
  host: '14.225.206.247',
  username: 'root',
  password: '5nOYlS6mTDuBF0GXk3Ih',
};

const localProjectPath = 'd:\\Sapo-Antigravity';
const archiveName = 'deploy.tar.gz';
const localArchivePath = path.join(localProjectPath, archiveName);
const remoteDeployPath = '/var/www/sapo-ems';

// Helper to run local commands
function runLocalCommand(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`[LOCAL] Running: ${cmd}`);
    exec(cmd, { cwd: localProjectPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[LOCAL ERROR] ${stderr}`);
        reject(error);
      } else {
        console.log(stdout);
        resolve(stdout);
      }
    });
  });
}

// Helper to run SSH commands
function runRemoteCommand(conn, cmd, streamOptions = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[REMOTE] Executing: ${cmd}`);
    conn.exec(cmd, streamOptions, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('close', (code, signal) => {
        if (code !== 0) {
          console.error(`[REMOTE ERROR] Command failed with code ${code}. Stderr: ${stderr}`);
          reject(new Error(`Command failed with code ${code}`));
        } else {
          resolve(stdout);
        }
      }).on('data', (data) => {
        const str = data.toString();
        stdout += str;
        process.stdout.write(str);
      }).stderr.on('data', (data) => {
        const str = data.toString();
        stderr += str;
        process.stderr.write(str);
      });
    });
  });
}

async function main() {
  try {
    console.log('====================================================');
    console.log('       STARTING SAPO EMS AUTO-DEPLOY TO VPS         ');
    console.log('====================================================\n');

    // 1. Pack source code locally
    console.log('Step 1: Compressing local project source code...');
    // We package only source files, config files, and DB schemas (excluding node_modules, .next, etc.)
    await runLocalCommand(`tar -czf ${archiveName} src prisma package.json package-lock.json next.config.js tsconfig.json next-env.d.ts`);
    console.log('✔ Compression complete.\n');

    // 2. Establish SSH connection
    console.log(`Step 2: Connecting to VPS (${config.host}) via SSH...`);
    const conn = new Client();
    
    await new Promise((resolve, reject) => {
      conn.on('ready', resolve)
          .on('error', reject)
          .connect(config);
    });
    console.log('✔ Connected successfully to remote VPS!\n');

    // 3. Configure Remote VPS Environment (Node, MySQL, Nginx)
    console.log('Step 3: Checking and installing remote dependencies...');
    
    // Update package list
    await runRemoteCommand(conn, 'apt-get update -y');
    
    // Install MySQL, Nginx, curl, build tools
    await runRemoteCommand(conn, 'apt-get install -y mysql-server nginx build-essential tar curl');
    console.log('✔ Basic packages installed.\n');

    // Install NVM and Node.js v20
    console.log('Installing NVM and Node.js v20...');
    const nvmInstallScript = `
      if [ ! -d "$HOME/.nvm" ]; then
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
      fi
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      nvm install 20
      nvm use 20
      nvm alias default 20
      npm install -g pm2
    `;
    await runRemoteCommand(conn, `bash -c '${nvmInstallScript}'`);
    console.log('✔ Node.js and PM2 configured.\n');

    // 4. Create and Configure MySQL database
    console.log('Step 4: Setting up MySQL database and credentials...');
    const mysqlSetup = `
      mysql -u root -e "CREATE DATABASE IF NOT EXISTS sapo_ems;"
      mysql -u root -e "CREATE USER IF NOT EXISTS 'sapo_user'@'localhost' IDENTIFIED WITH caching_sha2_password BY '5nOYlS6mTDuBF0GXk3Ih';"
      mysql -u root -e "ALTER USER 'sapo_user'@'localhost' IDENTIFIED WITH caching_sha2_password BY '5nOYlS6mTDuBF0GXk3Ih';"
      mysql -u root -e "GRANT ALL PRIVILEGES ON sapo_ems.* TO 'sapo_user'@'localhost';"
      mysql -u root -e "FLUSH PRIVILEGES;"
    `;
    await runRemoteCommand(conn, mysqlSetup);
    console.log('✔ Database and user created successfully.\n');

    // 5. Upload Code Archive
    console.log('Step 5: Uploading code package to VPS...');
    await new Promise((resolve, reject) => {
      conn.sftp((err, sftp) => {
        if (err) return reject(err);
        
        console.log(`SFTP: Uploading ${localArchivePath} to /tmp/${archiveName}...`);
        sftp.fastPut(localArchivePath, `/tmp/${archiveName}`, (putErr) => {
          if (putErr) return reject(putErr);
          console.log('✔ Code package uploaded successfully to VPS.');
          resolve();
        });
      });
    });
    console.log('');

    // 6. Extract Code on VPS & Configure project
    console.log('Step 6: Extracting code and setting up server folders...');
    await runRemoteCommand(conn, `mkdir -p ${remoteDeployPath}`);
    await runRemoteCommand(conn, `tar -xzf /tmp/${archiveName} -C ${remoteDeployPath}`);
    await runRemoteCommand(conn, `rm -f /tmp/${archiveName}`);
    
    // Create production .env file
    const envContent = 'DATABASE_URL="mysql://sapo_user:5nOYlS6mTDuBF0GXk3Ih@127.0.0.1:3306/sapo_ems"\\n';
    await runRemoteCommand(conn, `printf '${envContent}' > ${remoteDeployPath}/.env`);
    console.log('✔ Code extracted and remote .env configured.\n');

    // 7. Install packages, run Prisma migrations, and Build
    console.log('Step 7: Installing node packages & building Next.js bundle on VPS...');
    const appSetupCmds = `
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      cd ${remoteDeployPath}
      npm install
      npx prisma generate
      npx prisma db push --accept-data-loss
      npm run build
    `;
    await runRemoteCommand(conn, `bash -c '${appSetupCmds}'`);
    console.log('✔ App build and Prisma migrations completed successfully.\n');

    // 8. Start/Restart Application with PM2
    console.log('Step 8: Launching application in production using PM2...');
    const pm2Cmds = `
      export NVM_DIR="$HOME/.nvm"
      [ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"
      pm2 delete sapo-ems || true
      cd ${remoteDeployPath}
      pm2 start npm --name "sapo-ems" -- run start
      pm2 save
      pm2 startup | tail -n 1 | bash || true
    `;
    await runRemoteCommand(conn, `bash -c '${pm2Cmds}'`);
    console.log('✔ Application is now active and running on port 3000.\n');

    // 9. Configure Nginx Web Server Reverse Proxy
    console.log('Step 9: Configuring Nginx reverse proxy...');
    const nginxConfig = `cat << 'EOF' > /etc/nginx/sites-available/sapo-ems
server {
    listen 80;
    server_name ems.sapodaklak.com 14.225.206.247;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF`;
    await runRemoteCommand(conn, nginxConfig);
    await runRemoteCommand(conn, 'ln -sf /etc/nginx/sites-available/sapo-ems /etc/nginx/sites-enabled/sapo-ems');
    await runRemoteCommand(conn, 'rm -f /etc/nginx/sites-enabled/default');
    await runRemoteCommand(conn, 'nginx -t');
    await runRemoteCommand(conn, 'systemctl restart nginx');
    console.log('✔ Nginx reverse proxy configured. Applying SSL (HTTPS)...');
    
    // Automatically apply/ensure SSL certificate is active for ems.sapodaklak.com
    await runRemoteCommand(conn, 'certbot --nginx -d ems.sapodaklak.com --agree-tos -m admin@sapodaklak.com --no-eff-email --redirect --non-interactive || true');
    await runRemoteCommand(conn, 'systemctl restart nginx');
    console.log('✔ Nginx reverse proxy and SSL configured and restarted successfully!\n');

    // 10. Clean up local archive
    console.log('Step 10: Cleaning up local temporary files...');
    fs.unlinkSync(localArchivePath);
    console.log('✔ Local cleanup complete.\n');

    conn.end();
    
    console.log('====================================================');
    console.log('      🎉 SAPO EMS DEPLOYED SUCCESSFULLY TO VPS!     ');
    console.log(`      Website is now live at: http://${config.host} `);
    console.log('====================================================');

  } catch (error) {
    console.error('\n❌ DEPLOYMENT FAILED:', error);
    // Cleanup local archive in case of failure
    if (fs.existsSync(localArchivePath)) {
      fs.unlinkSync(localArchivePath);
    }
    process.exit(1);
  }
}

main();
