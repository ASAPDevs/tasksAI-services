const { ApolloServer } = require("apollo-server");
const { buildSubgraphSchema } = require("@apollo/federation");
const { typeDefs, resolvers } = require("./schema.js");

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs, resolvers }]),
});

server.listen({ port: 4001 }).then(({ url }) => {
  console.log(`User service ready at ${url}`);
});
