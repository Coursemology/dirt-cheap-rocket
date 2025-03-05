const express = require("express");
const httpProxy = require("http-proxy");

const CLIENT_PORT = process.env.DCR_CLIENT_PORT;
const SERVER_PORT = process.env.DCR_SERVER_PORT;
const PUBLIC_PATH = process.env.DCR_PUBLIC_PATH;
const ASSETS_DIR = process.env.DCR_ASSETS_DIR;
const VERBOSE = !!(process.env.DCR_VERBOSE) ?? false;

const app = express();

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
});

app.set('etag', false);

proxy.on("proxyReq", (proxyReq) => {
  proxyReq.setHeader("origin", `http://${proxyReq.host}:${SERVER_PORT}`);
});

proxy.on("error", (error, req, res) => {
  console.log(
    "\x1b[31m%s\x1b[0m",
    `[ERR@${new Date().toLocaleString()}] -> ${req.url}`
  );
  console.log(error, "\n");

  res.writeHead(500, { "Content-Type": "text/plain" });
  res.end("Something went wrong. Check the dirt-cheap-rocket console.");
});

app.use(PUBLIC_PATH, express.static(ASSETS_DIR));

app.all("/*", (req, res) => {
  const start = process.hrtime();
  if (req.query?.format === "json") {
    proxy.web(req, res, {
      target: `http://${req.hostname}:${SERVER_PORT}`,
    });
  } else {
    res.sendFile("index.html", { root: ASSETS_DIR });
  }
  res.set('Cache-Control', 'no-store');

  if (VERBOSE) {
    // Capture the response when finished
    res.on('finish', () => {
      const elapsedTime = process.hrtime(start);
      const elapsedTimeMs = (elapsedTime[0] * 1e3 + elapsedTime[1] / 1e6).toFixed(2);
      const httpVersion = `HTTP/${req.httpVersion}`;
      const method = req.method;
      const url = req.originalUrl;
      const reqLength = parseInt(req.get('content-length') || '0');

      // Extract the authentication method from the Authorization header
      const authHeader = req.get('Authorization');
      let authMethod, authToken, authEmail;
      if (authHeader) {
        [authMethod, authToken] = authHeader.split(' ');
        if (authToken) {
          const userData = authToken.split('.')[1];
          if (userData) {
            const userJson = JSON.parse(Buffer.from(userData, 'base64').toString());
            authEmail = userJson['email'];
          }
        }
      }

      const resContentType = res.get('content-type');
      const resLength = parseInt(res.get('content-length') || '0');
      const statusCode = res.statusCode;
      const statusMessage = res.statusMessage || 'Unknown';

      const requestInfo = [
        authMethod ? `${authMethod} auth`: undefined,
        authEmail,
        reqLength ? `${reqLength} bytes`: undefined
      ].filter(v => v).join(', ');
      const requestDetails = `${method} ${httpVersion} ${url}${requestInfo.length > 0 ? ` (${requestInfo})`: ""}`;

      const responseInfo = [
        resContentType,
        resLength ? `${resLength} bytes`: undefined
      ].filter(v => v).join(', ');
      const responseDetails = `${statusCode} ${statusMessage}${responseInfo.length > 0 ? ` (${responseInfo})`: ""}`;
      const timingDetails = `${elapsedTimeMs} ms`;

      console.log([requestDetails, responseDetails, timingDetails].join(' - '));
    });
  }
});

app.listen(CLIENT_PORT, () => {
  console.log(`App accessible on port ${CLIENT_PORT}`);
  console.log(`JSON requests proxied to port ${SERVER_PORT}`);
  console.log(`Static files served at :${CLIENT_PORT}/static`);
});
