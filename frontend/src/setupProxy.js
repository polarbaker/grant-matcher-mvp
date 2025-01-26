const { createProxyMiddleware } = require('http-proxy-middleware');

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4003';

module.exports = function(app) {
  // Proxy for user management service
  app.use(
    '/api/users',
    createProxyMiddleware({
      target: 'http://user-management:4000',
      changeOrigin: true,
      pathRewrite: {
        '^/api/users': '',
      },
    })
  );

  // Proxy for recommendation engine
  app.use(
    '/api/recommendations',
    createProxyMiddleware({
      target: 'http://recommendation-engine:4002',
      changeOrigin: true,
      pathRewrite: {
        '^/api/recommendations': '',
      },
    })
  );

  // Proxy for deck analysis
  app.use(
    '/api/deck-analysis',
    createProxyMiddleware({
      target: apiUrl,
      changeOrigin: true,
      pathRewrite: {
        '^/api/deck-analysis': '/',
      },
    })
  );

  // Proxy for scraping service
  app.use(
    '/api/scraping',
    createProxyMiddleware({
      target: 'http://scraping-service:4004',
      changeOrigin: true,
      pathRewrite: {
        '^/api/scraping': '',
      },
    })
  );
};
