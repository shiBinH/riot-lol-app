const router = require('express').Router()

function home_controller (req, res, next) {
  let index_location = '/public/index.html';
  res.sendFile(index_location, {root: __dirname});
}

router
  .use('/', (req, res, next) => {
    next();
  })
  .get('/', home_controller)

  

module.exports = router;