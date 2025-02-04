const { gql } = require("apollo-server-express");
const { GraphQLError } = require("graphql");
const bcrypt = require("bcryptjs");
const db = require("./models/db");
const axios = require("axios")

const typeDefs = gql`
  type Query {
    getDataML(user_id: Int!): MLData
    getLastGeneration(user_id: Int!): String
  }

  type Mutation {
    login(username: String!, password: String!): User!
    signup(email: String!, username: String!, password: String!): User!
    changePassword(userInput: ChangePasswordInput!): User!
    changeEmail(userInput: ChangeEmailInput!): User!
    deleteUser(id: ID!): User!
    generateDataML(user_id: Int!): MLDataObject!
  }

  type MLDataObject {
    ml: MLData
    lastGeneration: String
  }

  # for ML
  type MLData {
    recommendations: [String],
    metrics: Metrics
  }

  type Metrics {
    onTimeMetrics: OnTimeMetrics
  }

  type OnTimeMetrics {
    Dawn: Int,
    Morning: Int,
    Afternoon: Int,
    Evening: Int
  }

  input ChangeEmailInput {
    username: String!
    email: String!
  }

  input ChangePasswordInput {
    username: String!
    oldPassword: String!
    newPassword: String!
  }

  type User @key(fields: "id") {
    id: ID!
    username: String
    email: String
    lastgeneration: String
  }

  # type Task {
  #   id: ID!
  #   task_name: String
  #   task_description: String
  #   category: Int
  #   date: String
  #   time_start: String
  #   time_finished: String
  #   time_of_day: Int
  #   completed: Boolean
  #   completed_on_time: Int
  #   user_id: Int
  #   user: User
  # }
`;
const resolvers = {
  Task: {
    user: async (parent, args) => {
      //Find User from UserTable using parent.userID
      const { user_id } = parent;
      const user = await db.query("SELECT * FROM users WHERE id = $1;", [
        user_id,
      ]);
      return user.rows[0];
    },
  },
  Query: {
    getTasksByDay: async (_, args) => {
      // grab day from args and use to get tasks for the day
      const { date, user_id } = args; //"1670522400000"
      // date: '2022-12-11'   1day = 86.4 mil ms
      const startOfDay = new Date(date).getTime();
      const endOfDay = startOfDay + 86400000;
      const params = [startOfDay - 1, endOfDay, user_id];
      const task = await db.query(
        "SELECT * FROM tasks WHERE date > $1 AND date < $2 AND user_id = ($3) ORDER BY time_start ASC;",
        params
      );
      return task.rows;
    },
    getAllTasks: async (_, args) => {
      const { user_id } = args;
      const task = await db.query("SELECT * FROM tasks WHERE user_id = ($1) AND completed_on_time = 1;", [user_id]);
      return task.rows;
    },
    getDataML: async (_, args) => {
      const { user_id } = args;
      //check in the metrics table if there is a row that matches the user_id
      //if there is, we will just fetch and return that row
      const check = await db.query("SELECT * FROM metrics WHERE user_id = ($1);", [user_id]);
      //if there isnt, we make a call to the python service to generate the relevant data and insert into the DB and return.
      return check.rows.length !== 0 ? {recommendations: check.rows[0].recommendations, metrics: JSON.parse(check.rows[0].metrics)} : null
      // let dataML;
      // if (check.rows.length == 0) {
      //   const res = await axios.post(`http://127.0.0.1:5000/recommend/${user_id}`);
      //   dataML = res.data;
      //   await db.query('INSERT INTO metrics (recommendations, metrics, user_id) VALUES ($1, $2, $3)', [dataML.recommendations, JSON.stringify(dataML.metrics), user_id])
      // } else {
      //   dataML = {recommendations: check.rows[0].recommendations, metrics: JSON.parse(check.rows[0].metrics)}
      // }
      
      // return dataML
    },
    getLastGeneration: async (_, args) => {
      const { user_id } = args;
      console.log("get last gen args: ", args)
      const lastGeneration = await db.query("SELECT lastgeneration FROM users WHERE ID = ($1)", [user_id])
      console.log("last generation: ", lastGeneration.rows[0].lastgeneration)
      return lastGeneration.rows[0].lastgeneration;
    }
  },
  Mutation: {
    login: async (_, args) => {
      // grab username and password from args to verify >>> DB model
      const { username, password } = args;
      // Check if any input field is empty
      if (!username || !password) {
        throw new GraphQLError("Invalid fields");
      }

      const result = await db.query(
        "SELECT * FROM users WHERE username = $1;",
        [username]
      );
      const user = result.rows[0];
      if (!user) {
        throw new GraphQLError("No user");
      }

      // Verify password against hased password in database
      if (await bcrypt.compare(password, user.password)) {
        return user;
      } else {
        throw new GraphQLError("Password is incorrect");
      }
    },
    signup: async (_, args) => {
      // create user with email username and pass from args
      const { username, email, password } = args;
      // Check if any input field is empty
      if (!username || !email || !password) {
        throw new GraphQLError("Invalid fields");
      }

      // Check if email or username are already taken
      const dbResult = await db.query(
        "SELECT username FROM users WHERE username = $1",
        [username]
      );
      const existingUsername = dbResult.rows[0];
      if (existingUsername) {
        throw new GraphQLError(
          "Username is not available. Please choose another"
        );
      }
      const dbResult1 = await db.query(
        "SELECT email FROM users WHERE email = $1",
        [email]
      );
      const existingEmail = dbResult1.rows[0];
      if (existingEmail) {
        throw new GraphQLError("Email is not available. Please choose another");
      }

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = await db.query(
        "INSERT INTO users (username, password, email) VALUES ($1, $2, $3) RETURNING id, username, email;",
        [username, hashedPassword, email]
      );

      return newUser.rows[0];
    },
    changeEmail: async (_, args) => {
      const { username, email } = args.userInput;
      // Check if there is a same username exists in database. Throw error if not
      const dbResult = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );
      const existingUser = dbResult.rows[0];
      if (!existingUser) {
        throw new GraphQLError("User does not exist");
      }
      //update the email
      const updatedUser = await db.query(
        "UPDATE users SET email = $1 WHERE username = $2 RETURNING id, username, email;",
        [email, username]
      );
      return updatedUser.rows[0];
    },
    changePassword: async (_, args) => {
      const { username, oldPassword, newPassword } = args.userInput;
      // Check if there is a same username exists in database. Throw error if not
      const dbResult = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [username]
      );
      const existingUser = dbResult.rows[0];
      if (!existingUser) {
        throw new GraphQLError("User does not exist");
      }
      // Verify old password against hashed password in database
      if (await bcrypt.compare(oldPassword, existingUser.password)) {
        const salt = await bcrypt.genSalt(10);
        const newHashedPassword = await bcrypt.hash(newPassword, salt);
        const updatedUser = await db.query(
          "UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, email;",
          [newHashedPassword, username]
        );
        return updatedUser.rows[0];
      } else {
        throw new GraphQLError(
          "Invalid password. Please provide correct password"
        );
      }
    },
    deleteUser: async (_, args) => {
      const { id } = args;
      const results = await db.query(
        "DELETE FROM users WHERE id = $1 RETURNING *;",
        [id]
      );
      const deletedUser = results.rows[0]
      return deletedUser;
    },
    createTask: async (_, args) => {
      // post req to Task db table
      const {
        task_name,
        task_description,
        category,
        date,
        time_start,
        time_finished,
        time_of_day,
        completed,
        completed_on_time,
        user_id,
      } = args.task;

      const newTask = await db.query(
        "INSERT INTO tasks (task_name, task_description, category, date, time_start, time_finished, time_of_day, completed, completed_on_time, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;",
        [
          task_name,
          task_description,
          category ?? 0,
          date,
          time_start,
          time_finished,
          time_of_day,
          completed,
          completed_on_time ?? 0,
          user_id,
        ]
      );
      return newTask.rows[0];
    },
    updateTask: async (_, args) => {
      const {
        id,
        task_name,
        task_description,
        category,
        date,
        time_start,
        time_finished,
        time_of_day,
        completed,
        completed_on_time
      } = args.task;

      const queryString = `UPDATE tasks SET task_name = $1, task_description = $2, category = $3, date = $4, time_start = $5, time_finished = $6, time_of_day = $7, completed = $8, completed_on_time = $9 WHERE id = $10 RETURNING *;`;
      const updatedTask = await db.query(queryString, [
        task_name,
        task_description,
        category ?? 0,
        date,
        time_start,
        time_finished,
        time_of_day,
        completed,
        completed_on_time ?? 0,
        id,
      ]);
      return updatedTask.rows[0];
    },
    deleteTask: async (_, args) => {
      const { id } = args;
      const results = await db.query(
        "DELETE FROM tasks WHERE id = $1 RETURNING *;",
        [id]
      );
      const deletedTask = results.rows[0]
      return deletedTask;
    },
    completeTask: async (_, args) => {
      const { id, onTime } = args;

      const completedTask = await db.query(
        "UPDATE tasks SET completed = true, completed_on_time = $1 WHERE id = $2 RETURNING *;",
        [onTime ? 1 : 0, id]
      );
      return completedTask.rows[0]
    },
    pushTask: async (_, args) => {
      const { id, newStartTime, newEndTime, newTimeOfDay } = args;
      console.log('newTimeOfDay', newTimeOfDay)
      const updatedTask = await db.query("UPDATE tasks SET time_start = $1, time_finished = $2, time_of_day = $3 WHERE id = $4 RETURNING *;",
        [newStartTime, newEndTime, newTimeOfDay, id])
      return updatedTask.rows[0]
    },

    generateDataML: async(_, args) => {
      const { user_id } = args;
      //check in the metrics table if there is a row that matches the user_id
      //if there is, we will just fetch and return that row
      const check = await db.query("SELECT * FROM metrics WHERE user_id = ($1);", [user_id]);
      //if there isnt, we make a call to the python service to generate the relevant data and insert into the DB and return.
      const res = await axios.post(`https://dp57xnbzrxvnee5pkcze3ljuq40fqmdc.lambda-url.us-east-1.on.aws/recommend/${user_id}`);
      const dataML = res.data;
      if (check.rows.length == 0) {
        await db.query('INSERT INTO metrics (recommendations, metrics, user_id) VALUES ($1, $2, $3)', [dataML.recommendations, JSON.stringify(dataML.metrics), user_id])
      } else {
        // if (check.rows[0].expiry)
        await db.query('UPDATE metrics SET recommendations = ($1), metrics = ($2) WHERE user_id = ($3)', [dataML.recommendations, JSON.stringify(dataML.metrics), user_id])
      }

      const lastGeneration = await db.query('UPDATE users SET lastgeneration = ($1) WHERE id = ($2) RETURNING lastgeneration', [String(Date.now()), user_id])
     
      return {ml: dataML, lastGeneration: lastGeneration.rows[0].lastgeneration}
    }
  },
};

module.exports = { typeDefs, resolvers };
