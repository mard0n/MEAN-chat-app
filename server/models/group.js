const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const User = require("./user");
const Message = require("./message");

var messageSchema = new Schema({
  name: String,
  avatar: String,
  messages: [{ type: Schema.Types.ObjectId, ref: "Message" }],
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  admins: [{ type: Schema.Types.ObjectId, ref: "User" }],
  creator: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
  description: String
});

module.exports = mongoose.model("Message", messageSchema);