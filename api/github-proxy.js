// api/github-proxy.js — Vercel serverless function
// Proxies requests to GitHub Gist API with server-side token

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  var token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "Server config error: no token" });
  }

  var { path, method, body } = req.body || {};
  if (!path) {
    return res.status(400).json({ error: "Missing path" });
  }

  var url = "https://api.github.com" + path;
  var options = {
    method: method || "GET",
    headers: {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      "User-Agent": "Commiada-L"
    }
  };

  if (body && (method === "POST" || method === "PATCH")) {
    options.body = JSON.stringify(body);
  }

  try {
    var resp = await fetch(url, options);
    var data = await resp.json();
    return res.status(resp.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
