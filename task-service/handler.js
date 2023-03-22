const { ApolloServer } = require("apollo-server");
const { ApolloServerPluginInlineTrace } = require('@apollo/server/plugin/inlineTrace');
const { buildSubgraphSchema } = require("@apollo/federation");
const { typeDefs, resolvers } = require("./schema.js");
const { startServerAndCreateLambdaHandler, handlers } = require("@as-integrations/aws-lambda");

const SENSITIVE_REGEX = /sensitive/i;

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

const graphqlHandler = startServerAndCreateLambdaHandler(
  server,
  // We will be using the Proxy V2 handler
  handlers.createAPIGatewayProxyEventV2RequestHandler(),
);

module.exports = {
  graphqlHandler,
};