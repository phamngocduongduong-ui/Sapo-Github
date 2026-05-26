const fs = require('fs');
const logPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\b0582455-70bd-4136-9345-95846e73f1f0\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.trim().split('\n');
  for (let i = lines.length - 10; i < lines.length; i++) {
    if (!lines[i]) continue;
    const step = JSON.parse(lines[i]);
    console.log(`--- Step ${i}: Source: ${step.source}, Type: ${step.type} ---`);
    if (step.content) {
      console.log(step.content.substring(0, 500));
    }
  }
} catch (err) {
  console.error(err);
}
