const router = require('express').Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const config = require('../config');

const User = require('../models/user');

const Verify = require('./middleware/authentication');

router.get("/pageInit", Verify, (req, res)=>{
  User.findById(req.decoded.user_id, '-password').populate({path: "contactThread messageThread", populate:{path: "usersInContactThread", select:"-password -contactThread -messageThread"}}).exec((err, user)=>{
    res.json({success: true, message: "Hello " + user.username, userData: user})
  })
})

module.exports = router
