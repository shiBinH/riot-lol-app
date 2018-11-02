const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');


const HOSTNAME = "riot-lol-app-xyrho.c9users.io";
const Routes = {
  GET_DATES: '/data/dates',
  GET_GAMES_BY_DATE: '/data/dates/:date',
  GET_MINIMAPS_BY_DATE: '/images/dates/:date/games/:gameId/minimaps',
  PUT_GAMES: '/data/dates/:date/games/:gameId',
  POST_GAMES: '/data/dates/:date/games',
  PUT_TIMESLICES: '/data/dates/:date/games/:gameId/timeslices'
}

const GET_DATES_CONTROLLER = require('./controllers/get_dates_ctrl.js');
const POST_GAMES_BY_DATE_CONTROLLER = require('./controllers/post_games_by_date_ctrl.js');
const PUT_GAMES_BY_DATE_CONTROLLER = require('./controllers/put_games_by_date_ctrl.js');
const PUT_TIMESLICES_CONTROLLER = require('./controllers/put_timeslices_ctrl.js');
const GET_GAMES_BY_DATE_CONTROLLER = require('./controllers/get_games_by_date_ctrl.js');
const GET_MINIMAPS_CONTROLLER = require('./controllers/get_minimaps_ctrl.js');
const TEST_CONTROLLER = require('./controllers/test_ctrl.js');

const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
//  AWS_ACCESS_KEY_ID= AWS_SECRET_ACCESS_KEY= TEST=true nodemon app.js

/**
 * 
 * TODO
 *    1. Specify response code
 *    2. Validate input
 * 
 * 
 * */



//  routes
router
  
  //  entry
  .use(bodyParser.json())
  //  test routes
  .use('/test', TEST_CONTROLLER)
  //  get handlers
  .get(Routes.GET_DATES, GET_DATES_CONTROLLER)
  .get(Routes.GET_GAMES_BY_DATE, GET_GAMES_BY_DATE_CONTROLLER)
  .get(Routes.GET_MINIMAPS_BY_DATE, GET_MINIMAPS_CONTROLLER)
  //  POST, PUT handlers
  .put(Routes.PUT_GAMES, PUT_GAMES_BY_DATE_CONTROLLER)
  .post(Routes.POST_GAMES, POST_GAMES_BY_DATE_CONTROLLER)
  .put(Routes.PUT_TIMESLICES, PUT_TIMESLICES_CONTROLLER)


module.exports = router;