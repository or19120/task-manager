const mongoose = require("mongoose");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

// JWT SECRET:
const jwtSecret = "04095832158540642061asdbvcbdffgfdgasdcz274382567824587";
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    minlength: 1,
    trim: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  sessions: [
    {
      token: {
        type: String,
        required: true,
      },
      expiresAt: {
        type: Number,
        required: true,
      },
    },
  ],
});

// Instance Methods:
UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();
  // return the doc except the password and sessios so they won't be available.
  return _.omit(userObject, ["password", "sessions"]);
};

UserSchema.methods.generateAccessAuthToken = function () {
  const user = this;
  return new Promise((resolve, reject) => {
    //creating the JWT
    jwt.sign(
      { _id: user._id.toHexString() },
      jwtSecret,
      { expiresIn: "15m" },
      (err, token) => {
        if (!err) resolve(token);
        else reject(err);
      }
    );
  });
};

UserSchema.methods.generateRefreshAuthToken = function () {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(64, (err, buf) => {
      if (!err) {
        let token = buf.toString("hex");
        return resolve(token);
      } else reject(err);
    });
  });
};

UserSchema.methods.createSession = function () {
  let user = this;
  return user
    .generateRefreshAuthToken()
    .then((refreshToken) => {
      return saveSessionToDatabase(user, refreshToken);
    })
    .then((refreshToken) => {
      // saved to db and returning the refresh token
      return refreshToken;
    })
    .catch((e) => Promise.reject("Failed o save the session", e));
};

// model methods - static. they will be called on the model and not the User instance.

UserSchema.statics.getJWTSecret = () => {
  return jwtSecret;
};

UserSchema.statics.findByIdAndToken = function (_id, token) {
  // finds user by id and token
  // used in auth middleware (verifySession)

  const User = this;

  return User.findOne({
    _id,
    "sessions.token": token,
  });
};

UserSchema.statics.findByCredentials = function (email, password) {
  let User = this;
  return User.findOne({ email }).then((user) => {
    if (!user) return Promise.reject();

    return new Promise((resolve, reject) => {
      bcrypt.compare(password, user.password, (err, res) => {
        if (res) {
          resolve(user);
        } else {
          reject();
        }
      });
    });
  });
};

UserSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
  let secondsSinceStart = Date.now() / 1000;
  if (expiresAt > secondsSinceStart) return false;
  return true; //if token has expired.
};

// Middleware
UserSchema.pre("save", function (next) {
  let user = this;
  let costFactor = 10;
  if (user.isModified("password")) {
    // if the password field has been edited/changed then run this code.

    // Generate salt and hash password
    bcrypt.genSalt(costFactor, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});
// Helping methods
let saveSessionToDatabase = (user, refreshToken) => {
  // saving session to db
  return new Promise((resolve, reject) => {
    let expiresAt = genereateRefreshTokenExpiryTime();
    user.sessions.push({ token: refreshToken, expiresAt });
    user
      .save()
      .then(() => {
        // saved session
        return resolve(refreshToken);
      })
      .catch((e) => reject(e));
  });
};
let genereateRefreshTokenExpiryTime = () => {
  let daysUntilExpire = 10;
  let secondsUntilExpire = daysUntilExpire * 24 * 60 * 60;
  return Date.now() / 1000 + secondsUntilExpire;
};

const User = mongoose.model("User", UserSchema);

module.exports = { User };
