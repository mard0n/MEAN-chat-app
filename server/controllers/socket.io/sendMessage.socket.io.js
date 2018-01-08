const config = require("../../config");
const mongoose = require("mongoose");

const Verify = require("./../authentication");
const customModelsModules = require("../../models");


module.exports = function sendMessage (socket, io, currentUser) {
    socket.on("sendMessage", function(data) {
      if (!data.reciever) {
        // console.log("Hi buddy")
        socket.emit("exception", {
          message: "Please choose a user to send message"
        });
      } else {
        var result = Verify(data.token, config.secret);
        if (result.type == "exception") {
          socket.emit("exception", result.data);
        } else {
          let senderId = result.data.user_id;
          let recieverId = data.reciever._id;
          let messageSend = data.message;
          // console.log("senderId", senderId)
          // console.log("recieverId", recieverId)
          // console.log("messageSend", messageSend)
          var message = new customModelsModules.Message({
            _id: new mongoose.Types.ObjectId(),
            sender: senderId,
            reciever: recieverId,
            text: messageSend
          });
          message.save(function(err, newMessage) {
            if (err) throw err;
            customModelsModules.Message.findById(newMessage._id)
              // .populate({path: "sender reciever", select:"-password -contactThread"})
              .exec((err, foundMessage) => {
                // console.log("foundMEssage", foundMessage);
                customModelsModules.MessageThread
                  .findOneAndUpdate({ chatBetween: { $all: [senderId, recieverId] } }, { $addToSet: { messages: message._id }, $set: { lastMessage: message.text } }, { new: true })
                  .populate([
                    {
                      path: "chatBetween",
                      // match: { _id: { $ne: senderId } },
                      select: "username avatar"
                    },
                    {
                      path: "messages"
                      // populate: {
                      //   path: "reciever sender",
                      //   select: "username"
                      // }
                    }
                  ])
                  .exec(function(err, foundMessageThread) {
                    if (err) {
                      socket.emit("exception", {
                        message: "error occured",
                        err: err
                      });
                    } else {
                      // console.log("message", message)
                      if (!foundMessageThread) {
                        // console.log("foundMessageThread")
                        let messageThread = new customModelsModules.MessageThread(
                          {
                            _id: new mongoose.Types.ObjectId(),
                            chatBetween: [
                              mongoose.Types.ObjectId(
                                senderId
                              ),
                              mongoose.Types.ObjectId(
                                recieverId
                              )
                            ],
                            messages: [message._id]
                          }
                        );
                        messageThread.save(function(
                          err,
                          newMessageThread
                        ) {
                          customModelsModules.MessageThread.findByIdAndUpdate(newMessageThread._id, { lastMessage: message.text }, { new: true })
                            .populate([
                              {
                                path: "chatBetween", // match: {
                                //   _id: { $ne: senderId }
                                // },
                                select:
                                  "username avatar"
                              },
                              { path: "messages" }
                            ])
                            // populate: {
                            //   path: "reciever sender",
                            //   select: "username"
                            // }
                            .exec(function(
                              err,
                              updatedMessageThread
                            ) {
                              if (err) {
                                socket.emit(
                                  "exception",
                                  {
                                    message:
                                      "error occured",
                                    err: err
                                  }
                                );
                              } else {
                                // console.log("User find senderId", senderId)
                                // console.log("User find recieverId", recieverId)
                                customModelsModules.User.update({ _id: { $in: [senderId, recieverId] } }, { $addToSet: { messageThread: updatedMessageThread._id } }, { select: "username messageThread", multi: true })
                                  // .populate({path: "_id"})
                                  .exec(
                                    function(
                                      err,
                                      updatedUser
                                    ) {
                                      console.log(
                                        "updatedMessageThread",
                                        updatedMessageThread
                                      );
                                      // console.log("updatedUser", updatedUser);
                                      // console.log("rooms", socket.rooms);
                                      function filteredFor(
                                        anId
                                      ) {
                                        return {
                                          _id:
                                            updatedMessageThread._id,
                                          lastMessage:
                                            updatedMessageThread.lastMessage,
                                          messages:
                                            updatedMessageThread.messages,
                                          chatBetween: updatedMessageThread.chatBetween.filter(
                                            element => {
                                              return (
                                                element._id !=
                                                anId
                                              );
                                            }
                                          )
                                        };
                                      }

                                      io
                                        .to(
                                          recieverId
                                        )
                                        .emit(
                                          "successfully sent",
                                          {
                                            message:
                                              "Message thread was created and message was sent",
                                            messageSent: message,
                                            messageThread: filteredFor(
                                              recieverId
                                            )
                                          }
                                        );
                                      io
                                        .to(
                                          senderId
                                        )
                                        .emit(
                                          "successfully recieved",
                                          {
                                            message:
                                              "Message thread was created and message was sent",
                                            messageSent: message,
                                            messageThread: filteredFor(
                                              senderId
                                            )
                                          }
                                        );
                                    }
                                  );
                              }
                            });
                        });
                      } else {
                        // console.log("rooms", socket.rooms);
                        console.log("foundMessageThread", foundMessageThread._id);
                        io
                          .to(recieverId)
                          .emit("successfully sent", {
                            message: "Message was sent",
                            messageSent: message,
                            messageThread: foundMessageThread
                          });
                        io
                          .to(senderId)
                          .emit("successfully recieved", {
                            message: "Message was sent",
                            messageSent: message,
                            messageThread: foundMessageThread
                          });
                      }
                    }
                  });
              });
          });
        }
      }
    });
}