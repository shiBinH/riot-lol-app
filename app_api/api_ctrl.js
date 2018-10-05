const router = require('express').Router();

router
  .use('/', (req, res, next) => {
    console.log('Inside handler of: ' + req.url);
    res.send('FROM API');
  })

module.exports = router;