// this file will handle the connection logic to mongodb
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;
mongoose
  .connect("mongodb://localhost:27017/TaskManager", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to db!");
  })
  .catch((e) => console.log("Error: " + e));

module.exports = mongoose;
