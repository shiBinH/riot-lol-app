const express = require('express');
const JWT = require('jsonwebtoken');
const passport = require('passport');
const multer = require('multer');

const TEST_CONTROLLER = express.Router()
  //  generate token
  .get(
    '/issue_token',
    (req, res, next) => {
      let token = JWT.sign(
      {
        exp: (Date.now() / 1000) + 60,
        data: {
          user: 'SHI BIN',
          age: 25
        }
      },
      "SHI BIN HUANG"
    )
    
    
    res
      .status(200)
      .send(token);
    }
  )
  
  //  use token
  .get(
    '/use_token',
    passport.authorize('bearer', {session: false}),
    (req, res, next) => {
      console.log(req.account);
      res.end();
    }
  )
  
  //  get token
  .post(
    '/get_token',
    passport.authorize('local'),
    (req, res, next) => {
      res.redirect('issue_token')
    }

    
  )
  
  
  
module.exports = [
  (req, res, next) => {
    console.log('here')
    next();
  },
  multer().any(),
  TEST_CONTROLLER
]