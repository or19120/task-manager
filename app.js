const express = require("express");
const app = express();
const mongoose = require("./db/mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
app.use(bodyParser.json());
app.use(cors());

const path = require("path");

app.use(express.static(__dirname + "/dist/frontend"));

app.get("*", function (req, res) {
  // Replace the '/dist/<to_your_project_name>/index.html'
  res.sendFile(path.join(__dirname + "/dist/frontend/index.html"));
});

// middleware
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id"
  );

  res.header(
    "Access-Control-Expose-Headers",
    "x-access-token, x-refresh-token"
  );

  next();
});
// checking whether the req has a valid jwt and if the user can get to the page
let authenticate = (req, res, next) => {
  let token = req.header("x-access-token");
  jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
    if (err) {
      //jwt is invalid so user is not allowed
      res.status(401).send(err);
    } else {
      //jwt is valid and user can access.
      req.user_id = decoded._id;
      next();
    }
  });
};

// verify refresh token:
let verifySession = (req, res, next) => {
  // grab the refresh token from the request header
  let refreshToken = req.header("x-refresh-token");

  // grab the _id from the request header
  let _id = req.header("_id");

  User.findByIdAndToken(_id, refreshToken)
    .then((user) => {
      if (!user) {
        // user couldn't be found
        return Promise.reject({
          error:
            "User not found. Make sure that the refresh token and user id are correct",
        });
      }
      // if the code reaches here - the user was found
      // therefore the refresh token exists in the database - but we still have to check if it has expired or not
      req.user_id = user._id;
      req.userObject = user;
      req.refreshToken = refreshToken;
      let isSessionValid = false;
      user.sessions.forEach((session) => {
        if (session.token === refreshToken) {
          // check if the session has expired
          if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
            // refresh token has not expired
            isSessionValid = true;
          }
        }
      });
      if (isSessionValid) {
        // the session is VALID - call next() to continue with processing this web request
        next();
      } else {
        // the session is not valid
        return Promise.reject({
          error: "Refresh token has expired or the session is invalid",
        });
      }
    })
    .catch((e) => {
      res.status(401).send(e);
    });
};

////////////

// Mongoose Models we Created:
const { List, Task, User } = require("./db/model/index");

// CRUD for lists
app.get("/lists", authenticate, (req, res) => {
  // array of all lists in the db for that specific user who's logged in.
  List.find({
    _userId: req.user_id,
  }).then((lists) => {
    res.send(lists);
  });
});

app.post("/lists", authenticate, (req, res) => {
  // add a list to the db. returns it to the user with the id.
  let title = req.body.title;
  let _userId = req.user_id;

  let newList = new List({
    title,
    _userId,
  });
  newList.save().then((listDoc) => {
    // we now have the list document that was saved
    res.send(listDoc);
  });
});

app.patch("/lists/:id", authenticate, (req, res) => {
  // updates a list
  List.findOneAndUpdate(
    { _id: req.params.id, _userId: req.user_id },
    {
      $set: req.body,
    }
  ).then(() => {
    res.send({ message: "updated successfuly" });
  });
});
app.delete("/lists/:id", authenticate, (req, res) => {
  // delete a list by its id
  List.findOneAndRemove({ _id: req.params.id, _userId: req.user_id }).then(
    (removedDoc) => {
      res.send(removedDoc);

      //delete all the tasks within that list:
      deleteTasksFromList(removedDoc._id);
    }
  );
});

// *************//
app.get("/tasks", (req, res) => {
  Task.find().then((tasks) => res.send(tasks));
});
// CRUD for tasks inside lists
app.get("/lists/:listId/tasks", authenticate, (req, res) => {
  // this will return us all the tasks that are under a certain List.
  Task.find({ _listId: req.params.listId }).then((tasks) => {
    res.send(tasks);
  });
});

app.get("/lists/:listId/tasks/:taskId", (req, res) => {
  Task.findOne({
    _id: req.params.taskId,
    _listId: req.params.listId,
  }).then((task) => res.send(task));
});

app.post("/lists/:listId/tasks", authenticate, (req, res) => {
  // creates a new task in a specific list.
  let newTask = new Task({
    title: req.body.title,
    _listId: req.params.listId,
  });
  let codeToDo = newTask.save().then((task) => res.send(task));
  checkUserHasList(req.params.listId, req.user_id, codeToDo);
});

app.patch("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  // update an existing task specified by taskId.

  let codeToDo = Task.findOneAndUpdate(
    { _id: req.params.taskId, _listId: req.params.listId },
    {
      $set: req.body,
    }
  ).then(() => {
    res.send({ message: "Updated Successfully" });
  });
  checkUserHasList(req.params.listId, req.user_id, codeToDo);
});

// app.patch("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
//   // We want to update an existing task (specified by taskId)

//   List.findOne({
//     _id: req.params.listId,
//     _userId: req.user_id,
//   })
//     .then((list) => {
//       if (list) {
//         // list object with the specified conditions was found
//         // therefore the currently authenticated user can make updates to tasks within this list
//         return true;
//       }

//       // else - the list object is undefined
//       return false;
//     })
//     .then((canUpdateTasks) => {
//       if (canUpdateTasks) {
//         // the currently authenticated user can update tasks

//         Task.findOneAndUpdate(
//           {
//             _id: req.params.taskId,
//             _listId: req.params.listId,
//           },
//           {
//             $set: req.body,
//           }
//         )
//           .then(() => {
//             res.send({ message: "Updated successfully." });
//           })
//           .catch((e) => console.log(e));
//       } else {
//         res.sendStatus(404);
//       }
//     })
//     .catch((e) => console.log(e));
// });
app.delete("/lists/:listId/tasks/:taskId", authenticate, (req, res) => {
  let toDo = Task.findOneAndRemove({
    _id: req.params.taskId,
    _listId: req.params.listId,
  }).then((removedTask) => res.send(removedTask));
  checkUserHasList(req.params.listId, req.user_id, toDo);
});

// user routes:

app.post("/users", (req, res) => {
  // User sign up

  let body = req.body;
  let newUser = new User(body);

  newUser
    .save()
    .then(() => {
      return newUser.createSession();
    })
    .then((refreshToken) => {
      // Session created successfully - refreshToken returned.
      // now we geneate an access auth token for the user

      return newUser.generateAccessAuthToken().then((accessToken) => {
        // access auth token generated successfully, now we return an object containing the auth tokens
        return { accessToken, refreshToken };
      });
    })
    .then((authTokens) => {
      // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
      res
        .header("x-refresh-token", authTokens.refreshToken)
        .header("x-access-token", authTokens.accessToken)
        .send(newUser);
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

// User login
app.post("/users/login", (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  User.findByCredentials(email, password)
    .then((user) => {
      return user
        .createSession()
        .then((refreshToken) => {
          // Session created successfully - refreshToken returned.
          // now we geneate an access auth token for the user

          return user.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken };
          });
        })
        .then((authTokens) => {
          // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
          res
            .header("x-refresh-token", authTokens.refreshToken)
            .header("x-access-token", authTokens.accessToken)
            .send(user);
        });
    })
    .catch((e) => {
      console.log("errorrrr");

      res.status(400).send(e);
    });
});

// generate and return access token.
app.get("/users/me/access-token", verifySession, (req, res) => {
  //once getting here, we know that the user is authenticated. we also have the user and his id available.
  req.userObject
    .generateAccessAuthToken()
    .then((accessToken) => {
      res.header("x-access-token", accessToken).send({ accessToken });
    })
    .catch((e) => {
      res.status(400).send(e);
    });
});

let deleteTasksFromList = (_listId) => {
  Task.deleteMany({
    _listId,
  }).then(() => console.log(`Tasks from ${_listId} were deleted`));
};

let checkUserHasList = (_id, _userId, codeToExecute) => {
  List.findOne({ _id, _userId })
    .then((list) => {
      console.log("here");
      if (list) return true;
      return false;
    })
    .then((hasAccess) => {
      if (hasAccess) codeToExecute;
    })
    .catch((e) => res.status(404).send("List not found"));
};

// Start the app by listening on the default Heroku port
app.listen(process.env.PORT || 8080);
