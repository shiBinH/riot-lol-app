const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const request = require('request');

const get_data_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl)
  res.json({
    status: "SUCCESS!"
  });
}

const get_minimaps_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl)
  res.json({
    status: 'success!'
  });
}

const get_scoreboards_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl)
  res.json({
    status: 'success!'
  });
}

const get_images_by_date_main_handler = express.Router()
  .get('/minimaps/:timestamp', get_minimaps_by_date_handler)
  .get('/scoreboards/:timestamp', get_scoreboards_by_date_handler);

const get_images_by_date_entry_handler = (req, res, next) => {
  console.log('\nENTRY handler of:', req.originalUrl )
  next();
}

const test_handler = (req, res, next) => {
  if (process.env.TEST) {
    request({
      url: 'https://riot-lol-app-xyrho.c9users.io/wheres_the_jungler/images/add/by-date/wed_oct_10_2018',
      method: 'POST',
      json: true,
      body: {
        key1: 'val1',
        key2: 'val2'
      }
      
    },
      (err, response, body) => {
        res.json(body)
      }
    )
  }
  
  else 
    next();
}

router
  //  entry
  .use(bodyParser.json())
  //  get handlers
  .get('/test', test_handler)
  .get('/data/by-date/:date', get_data_by_date_handler)
  .use(
    '/images/by-date/:date', 
    get_images_by_date_entry_handler, 
    get_images_by_date_main_handler
  )
  //  post handlers
  .post(
    '/images/add/by-date/:date', 
    (req, res, next) => {
      console.log('POST handler of', req.originalUrl);
      console.log('BODY:', req.body);
      res.json(req.body);
    }
  )
    
  
  /*
  
  date:
    /wheres_the_jungler/data/by-date/{date}
  
  images:
    /wheres_the_jungler/icons/{champion info}
  
    /wheres_the_jungler/images/by-date/{date}/minimaps/{timestamp}
    /wheres_the_jungler/images/by-date/{date}/scoreboards/{timestamp}
    
  
  */

module.exports = router;