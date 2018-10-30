const PASSPORT = require('passport');
const JWT = require('jsonwebtoken');
const BearerStrategy = require('passport-http-bearer');
const LocalStrategy = require('passport-local').Strategy;

PASSPORT.use(new BearerStrategy(
  (token, done) => {
      
      try {
        done(null, JWT.verify(token, "SHI BIN HUANG"))
      } catch(err) {
        done(null, false)
      }

    }    
))


PASSPORT.use(
  new LocalStrategy(
    (username, password, done) => {
      //  needs tls
      console.log(username)
      console.log(password)
      done(null, {data: 'success'})
    }
  )
)


