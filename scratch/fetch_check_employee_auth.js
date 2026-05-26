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
    path: '/an-ninh/kiem-tra',
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
      console.log("Response headers:", res.headers);
      console.log("Data length:", data.length);
      if (res.statusCode === 200) {
        // Save the html to a file to inspect it
        const fs = require('fs');
        fs.writeFileSync('scratch/check_employee.html', data);
        console.log("Saved response to scratch/check_employee.html");
      } else {
        console.log("Response body:", data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
  });

  req.end();
}

main().catch(console.error);
