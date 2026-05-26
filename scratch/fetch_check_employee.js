const http = require("http");

http.get("http://localhost:3000/an-ninh/kiem-tra", (res) => {
  let data = "";
  res.on("data", (chunk) => { data += chunk; });
  res.on("end", () => {
    console.log("Status Code:", res.statusCode);
    console.log("Data length:", data.length);
    // Print first 500 chars
    console.log("Head:", data.substring(0, 500));
  });
}).on("error", (err) => {
  console.error("Error fetching page:", err.message);
});
