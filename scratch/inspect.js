const fs = require('fs');
const buffer = fs.readFileSync('public/images/login_banner.png');
let i = 2; // skip SOI (FF D8)
while (i < buffer.length) {
  if (buffer[i] === 0xFF) {
    const marker = buffer[i + 1];
    if (marker === 0xD9 || marker === 0xDA) {
      break; // End of image or Start of scan
    }
    const len = buffer.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xC3) {
      const height = buffer.readUInt16BE(i + 5);
      const width = buffer.readUInt16BE(i + 7);
      console.log(`JPEG Dimensions: ${width}x${height}`);
      process.exit(0);
    }
    i += 2 + len;
  } else {
    i++;
  }
}
console.log("No SOF marker found");
