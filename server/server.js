const express = require('express');
const { ApolloServer } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const path = require('path');
const { authMiddleware } = require('./utils/auth');
const cors = require('cors');

const { typeDefs, resolvers } = require('./schemas');
const db = require('./config/connection');

// Create Express app
const app = express();

// Initialize Apollo Server
let serverPromise = (async function() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  
  await server.start();
  
  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());
  
  app.use('/graphql', cors(), expressMiddleware(server, {
    context: authMiddleware
  }));
  
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/dist')));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });
  }
  
  return server;
})();

// Make app handle requests only after ensuring server is started
const handler = async (req, res) => {
  try {
    // Wait for server to be initialized
    await serverPromise;
    
    // Now handle the request with the fully initialized app
    return app(req, res);
  } catch (error) {
    console.error('Error in serverless function:', error);
    res.status(500).send('Server error');
  }
};

// Start the local dev server if not in production
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  
  db.once('open', () => {
    app.listen(PORT, () => {
      console.log(`API server running on port ${PORT}!`);
      console.log(`Use GraphQL at http://localhost:${PORT}/graphql`);
    });
  });
}

// Export the handler for serverless environments
module.exports = handler;
