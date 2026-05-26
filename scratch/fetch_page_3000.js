const { SignJWT } = require("jose");
const http = require("http");

const secretKey = process.env.JWT_SECRET || "ems-super-secret-key-do-not-share-in-production";
const key = new TextEncoder().encode(secretKey);

async function encrypt(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

async function main() {
  const token = await encrypt({
    employeeName: "Admin Test",
    role: "admin",
    id: "admin-id"
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/sales/hop-dong',
    method: 'GET',
    headers: {
      'Cookie': `session=${token}`
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log("Status Code:", res.statusCode);
      const matches = data.match(/<(div|span)[^>]*class="[^"]*status-pill[^"]*"[^>]*>([\s\S]*?)<\/(div|span)>/g);
      console.log("Found status-pill matches:");
      if (matches) {
        matches.forEach((m, idx) => console.log(`${idx}: ${m}`));
      } else {
        console.log("No status-pill matches found.");
      }
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.end();
}

main().catch(console.error);
