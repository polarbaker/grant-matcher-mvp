const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:4000',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // remove /api prefix
      },
      onProxyReq: function(proxyReq, req, res) {
        // Log proxy requests for debugging
        console.log('Proxying:', req.method, req.path, '->', proxyReq.path);
      },
      onError: function(err, req, res) {
        console.error('Proxy Error:', err);
      }
    })
  );
};
