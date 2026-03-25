fetch("http://localhost:3000/api/mockup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://example.com",
    issues: [],
    score: 80,
    html: "<html><body><h1>Test</h1></body></html>"
  })
}).then(res => res.json()).then(console.log).catch(console.error);
