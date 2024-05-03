const express = require("express");
const httpProxy = require("http-proxy");

const CLIENT_PORT = process.env.DCR_CLIENT_PORT;
const SERVER_PORT = process.env.DCR_SERVER_PORT;
const PUBLIC_PATH = process.env.DCR_PUBLIC_PATH;
const ASSETS_DIR = process.env.DCR_ASSETS_DIR;

const app = express();

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
});

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
  console.log("request: ", req);
  console.log("res: ", res);
  if (req.query?.format === "json") {
    proxy.web(req, res, {
      target: `http://${req.hostname}:${SERVER_PORT}`,
    });
  } else {
    res.sendFile("index.html", { root: ASSETS_DIR });
  }
});

app.listen(CLIENT_PORT, () => {
  console.log(`App accessible on port ${CLIENT_PORT}`);
  console.log(`JSON requests proxied to port ${SERVER_PORT}`);
  console.log(`Static files served at :${CLIENT_PORT}/static`);
});
