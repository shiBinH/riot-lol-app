/**
   * Endpoint:
   *    /wheres-the-jungler/data/dates/:date/games/:gameId
   * 
   * 
   * */

const AWS = require('aws-sdk')
const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
const multer = require('multer');
const upload = multer();

const PUT_GAMES_BY_DATE_HANDLER = (req, res, next) => {
  
  const BODY_DATA = JSON.parse(req.body.data);
  const REQ_DATE = req.params.date;
  const REQ_GAME_ID = parseInt(req.params.gameId);
  AWS.config.update({
    region: AWS_REGION,
    endpoint: AWS_DYNAMODB_END_POINT
  })
  const docClient = new AWS.DynamoDB.DocumentClient();
  
  const query = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    Key: {
      'date': REQ_DATE,
      'gameId': REQ_GAME_ID
    },
  }
  docClient.get(
    query,
    (err, gameData) => {
      if (err) {
        console.error(
          '\nUnable to get item. Error:', 
          JSON.stringify(err, null, 4)
        );
      } else {
        
        const NEW_ITEM = {
          TableName: AWS_DYNAMODB_TABLE_NAME,
          Item: {
            date: REQ_DATE,
            gameId: REQ_GAME_ID,
            timeSlices: []
          },
          ReturnValues: 'ALL_OLD'
        }
        //  Need a better way to extract data
        Object.assign(NEW_ITEM.Item, BODY_DATA);
      
        AWS.config.update({
          region: AWS_REGION,
          endpoint: AWS_DYNAMODB_TABLE_NAME
        })
        docClient.put(
          NEW_ITEM,
          (err, oldData) => {
            if (err) {
              
              console.error(
                '\nUnable to add item. Error:', 
                JSON.stringify(err, null, 4)
              );
              
            } else {
              
              console.log('\nSuccessfully PUT item:', oldData)
              
            }
            res.end()
          }
        )
        
      }
    }
  )
  
}


module.exports = [
  upload.any(),
  PUT_GAMES_BY_DATE_HANDLER
]