/**
 * 
 * 
 * 
 * Endpoint:
 *    /wheres-the-jungler/data/dates/{date}/games
 *    ex:
 *      /wheres-the-jungler/data/dates/Oct 25 2018/games
 * 
 */

const AWS = require('aws-sdk')
const AWS_REGION = 'us-east-2';
const AWS_DYNAMODB_END_POINT = 'https://dynamodb.us-east-2.amazonaws.com';
const AWS_DYNAMODB_TABLE_NAME = 'Wheres-the-Jungler'
const multer = require('multer');
const upload = multer();

const post_games_handler = (req, res, next) => {
  const BODY_DATA = JSON.parse(req.body.data);
  const REQ_DATE = req.params.date
  AWS.config.update({
    region: AWS_REGION,
    endpoint: AWS_DYNAMODB_END_POINT
  })
  const DOC_CLIENT = new AWS.DynamoDB.DocumentClient();

  const DYNAMODB_QUERY_DATES = {
    TableName: AWS_DYNAMODB_TABLE_NAME,
    Key: {
      date: REQ_DATE
    },
    ExpressionAttributeNames: {
      '#d': 'date'
    },
    ExpressionAttributeValues: {
      ':targetYear': REQ_DATE
    },
    FilterExpression: '#d = :targetYear'
  }
  
  DOC_CLIENT.scan(
    DYNAMODB_QUERY_DATES,
    (err, gameData) => {
      if (err) {
        console.error('Unable to get item. Error:', JSON.stringify(err, null, 4));
      } else {
        const NEXT_GAME_ID = 1 + (function get_highest_current_game_id(items)  {
          
          let highestCurrentGameId = 0;
          for (let i in items) {
            highestCurrentGameId = Math.max(highestCurrentGameId, gameData.Items[i].gameId)
          }
          
          return highestCurrentGameId;
          
        })(gameData.Items);
        
        const NEW_DB_ITEM = {
          TableName: AWS_DYNAMODB_TABLE_NAME,
          Item: {
            date: REQ_DATE  //  needs validation
          },
          ReturnValues: 'ALL_OLD'
        }
        //  needs a better way to extract data
        Object.assign(NEW_DB_ITEM.Item, BODY_DATA);
        NEW_DB_ITEM.Item.gameId = NEXT_GAME_ID;
        if  (!NEW_DB_ITEM.Item.timeSlices) {
          NEW_DB_ITEM.Item.timeSlices = [];
        }
        
        //  POST data to DynamoDB
        AWS.config.update({
          region: AWS_REGION,
          endpoint: AWS_DYNAMODB_END_POINT
        })
        DOC_CLIENT.put(
          NEW_DB_ITEM,
          (err, oldData) => {
            if (err) {
              console.error(
                '\nUnable to add item. Error:', 
                JSON.stringify(err, null, 4)
              );
            } else {
              console.log(
                '\nSuccessfully added item:', 
                oldData
              )
            }
            res.end()
          }
        )
        
      }
    }
  )
   
}

module.exports = [upload.any(), post_games_handler]


