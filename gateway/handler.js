const express = require('express');
const app = express();
const { ApolloServer } = require('@apollo/server');
const { ApolloGateway, IntrospectAndCompose } = require('@apollo/gateway');
const { startServerAndCreateLambdaHandler, handlers } = require("@as-integrations/aws-lambda");

require('dotenv').config();

let loadedGateway;

async function getGateway() {
  if (loadedGateway) {
    return loadedGateway;
  }
  
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        { name: 'user-service', url: 'https://3jiwocx6dk5lcattp53h35tqqe0havgc.lambda-url.us-east-1.on.aws/' },
        { name: 'task-service', url: 'https://ivvvj75hqhshs4l5h35czrctdq0nevxn.lambda-url.us-east-1.on.aws/' },
        // add more services here as needed
      ],
    }),
  });

  const { schema, executor } = await gateway.load();

  loadedGateway = { schema, executor };

  return loadedGateway;
}

async function createHandler() {
  const { schema, executor } = await getGateway();

  const server = new ApolloServer({
    schema,
    executor,
    playground: process.env.PLAYGROUND === "true",
    introspection: process.env.INTROSPECTION === "true"
  });

  return startServerAndCreateLambdaHandler(
    server,
    handlers.createAPIGatewayProxyEventV2RequestHandler(),
  );
}

module.exports = {
  graphqlHandler: async (event, context) => {
    const handler = await createHandler();
    return handler(event, context);
  },
};



// const gateway = new ApolloGateway({
//   supergraphSdl: new IntrospectAndCompose({
//   subgraphs: [
//     { name: 'user-service', url: 'https://3jiwocx6dk5lcattp53h35tqqe0havgc.lambda-url.us-east-1.on.aws/' },
//     { name: 'task-service', url: 'https://ivvvj75hqhshs4l5h35czrctdq0nevxn.lambda-url.us-east-1.on.aws/' },
//     // add more services here as needed
//     ],
//   }),
// });



// async function createHandler() {
//   const { schema, executor } = await gateway.load();

//   const server = new ApolloServer({
//     schema,
//     executor,
//     playground: process.env.PLAYGROUND === "true",
//     introspection: process.env.INTROSPECTION === "true"
//   });

//   return startServerAndCreateLambdaHandler(
//     server,
//     handlers.createAPIGatewayProxyEventV2RequestHandler(),
//   );
// }

// // async function graphqlHandler(event, context) {
// //   const handler = await createHandler(event, context);
// //   return handler;
// // }

// // const graphqlHandler = createHandler();

// module.exports = {
//   graphqlHandler: async (event, context) => {
//     const handler = await createHandler();
//     return handler(event, context);
//   },
//   // graphqlHandler
// };
