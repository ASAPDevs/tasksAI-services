const { ApolloServer } = require("@apollo/server");
const { buildSubgraphSchema } = require("@apollo/federation");
const { typeDefs, resolvers } = require("./schema.js");
const { startServerAndCreateLambdaHandler, handlers } = require("@as-integrations/aws-lambda");


const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
  playground: process.env.PLAYGROUND === "true",
  introspection: process.env.INTROSPECTION === "true"
});

const graphqlHandler = startServerAndCreateLambdaHandler(
  server,
  // We will be using the Proxy V2 handler
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
);

// exports.graphqlHandler = createLambdaHandler(server);

module.exports = {
  graphqlHandler,
};