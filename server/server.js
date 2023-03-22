// const express = require('express');
// const app = express();
// const path = require('path');
// const { ApolloServer } = require('apollo-server-express');
// const {typeDefs, resolvers} = require('./schema');

// const PORT = process.env.PORT;
// //intiate a new Apollo graphQL server here.
// async function startApolloServer(typeDefs, resolvers) {
//   const server = new ApolloServer({typeDefs, resolvers});
//   await server.start();
//   server.applyMiddleware({app, path: "/graphql"});
// }


// app.listen(PORT, () => {
//   console.log("LISTENING ON PORT: ", PORT)
// })

// startApolloServer(typeDefs, resolvers);

// module.exports = app;

const express = require('express');
const app = express();
const { ApolloServer } = require('apollo-server-express');
const { ApolloGateway } = require('@apollo/gateway');

require('dotenv').config();

const gateway = new ApolloGateway({
  serviceList: [
    { name: 'userService', url: 'http://localhost:4001/graphql' },
    { name: 'taskService', url: 'http://localhost:4002/graphql' },
    // add more services here as needed
  ],
});

async function startApolloServer() {
  const { schema, executor } = await gateway.load();

  const server = new ApolloServer({
    schema,
    executor,
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });
}

startApolloServer();

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});


