const express = require('express')
const router = express.Router();
const path  = require('path');


const get_data_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl, 'params:', req.params)
  res.json({
    date: req.params.date
    //  date: (new Date()).toDateString().replace(/ /g, '_')
  });
}

const get_minimaps_by_date_handler = (req, res, next) => {
  console.log('GET handler of:', req.originalUrl, 'params:', req.params)
  res.json({
    status: 'success!'
  });
}

const get_images_by_date_main_handler = express.Router();
get_images_by_date_main_handler
  .get('/minimaps/:timestamp', get_minimaps_by_date_handler);

const get_images_by_date_entry_handler = (req, res, next) => {
  req.test = req.params
  next();
}

router
  .get('/data/by-date/:date', get_data_by_date_handler)
  .use(
    '/images/by-date/:date', 
    get_images_by_date_entry_handler, 
    get_images_by_date_main_handler
  );
    
  
  /*
  
  date:
    /wheres_the_jungler/data/{date}
  
  images:
    /wheres_the_jungler/icons/{champion info}
  
    /wheres_the_jungler/images/by-date/{date}/minimaps/{timestamp}
    /wheres_the_jungler/images/by-date/{date}/scoreboards/{timestamp}
    
  
  */

module.exports = router;