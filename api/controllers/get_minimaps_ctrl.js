/**
 * 
 * Endpoint:
 *  wheres-the-jungler/images/dates/{date}/games/{gameId}/minimaps?min={int}&sec={int}
 * 
 * Returns an PNG image pertaining to the supplied parameters
 * 
 * */
const AWS = require('aws-sdk')

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
 
const GET_MINIMAPS_BY_DATE_CONTROLLER = (req, res, next) => {
  
  
  AWS.config.update({region: 'REGION', endpoint: undefined});
  
  const BUCKET_NAME = 'wheres-the-jungler-minimaps';
  const REQ_DATE = req.params.date;
  const REQ_GAME_ID = req.params.gameId;
  const GET_OBJECT_PARAMS = {
    Bucket: BUCKET_NAME,
    Key: createKey(REQ_DATE, REQ_GAME_ID, req.query.min, req.query.sec)
  }
  
  
  s3.getObject(
    GET_OBJECT_PARAMS,
    (err, data) => {
      if (err) {
        console.log("Error", err);
        res.end();
      } else {
        
        console.log('Successfully got minimap');
        res.set('Content-Type', 'image/png')
        res.send(data.Body);
      }
    }
  )
  
}

/*  HELPER FUNCTIONS  */
/**********************/
function createKey(date, gameId, min, sec, format) {
  //  need to validate input
  return  date +
          ' game-' + gameId +
          ' minimap' +
          ' ' + min + 'm' + sec + 's' +
          '.png'
  //  Wed_Oct_11_2018_game-1_minimap_5m41s.png
}

module.exports = GET_MINIMAPS_BY_DATE_CONTROLLER;