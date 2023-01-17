# Specify a base image to start with, here we selected alpine version of node
FROM node:18.12
# Create a working directory inside the container
WORKDIR /usr/src/app

COPY ./package.json .
# Install all dependencies
RUN npm install --force
# Copy over all the source file to docker
COPY . /usr/src/app
# Build production version of our app
# RUN npm run build --force

EXPOSE 3000

CMD npm start