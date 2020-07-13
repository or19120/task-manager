// this file will handle the connection logic to mongodb
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;
mongoose
  .connect(
    "mongodb+srv://or19120:Oro191200@cluster0-qi9bu.gcp.mongodb.net/Todo?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useCreateIndex: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to db!");
  })
  .catch((e) => console.log("Error: " + e));

module.exports = mongoose;
