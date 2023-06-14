import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand, 
  UpdateCommand,
  GetCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
const AWS = require('aws-sdk');
const cognito = new AWS.CognitoIdentityServiceProvider();
const jwt = require('jsonwebtoken');
const client = new DynamoDBClient({region: 'us-west-2'});

const dynamoDb = DynamoDBDocumentClient.from(client);

const TABLE = 'cs-493-final-project-main-users';

async function getUser(user) {
  const params = {
    TableName: TABLE,
    Key: {
      'users': user
    }
  };
  try {
    const data = await dynamoDb.send(new GetCommand(params));
    return data.Item;
  } catch (error) {
    console.error(error);
  }
}

async function getUserUUID(idToken) {
  idToken = idToken.split(' ');
  idToken = idToken[1];
  console.log(idToken)
  const params = {
    AccessToken: idToken
  };
  try {
    const decoded = jwt.decode(idToken);
    // const response = await cognito.getUser(params).promise();
    const sub = decoded.sub;
    // const sub = response.UserAttributes.find(attribute => attribute.Name === 'sub').Value;
    return sub;
  } catch (error) {
    console.error('An error occurred while calling cognito.getUser:', error);
    return null;
  }
}

async function verifyIdToken(idToken, user) {
  if (idToken == null) {
    return false;
  }
  let uuid = await getUserUUID(idToken)
  // const decodedToken = jwt.decode(idToken, {complete: true});
  // const sub = decodedToken.payload.sub;
  console.log(`user: ${user}- idToken: ${uuid}`)
  if (uuid == user) {
    return true;
  } else {
    console.log('User not found');
    return false;
  }
}

export const handler = async (event) => {
  let data;
  const request = event['httpMethod'];
  console.log(request);
  var path = JSON.stringify(event['path']);
  path.replace('"','');
  const pathArray = path.split("/");
  // pathArray.pop()
  pathArray.shift();
  pathArray[pathArray.length-1] = pathArray[pathArray.length-1].replace('\"','');
  if (pathArray[1]) {
    console.log("A get is commencing")
    data = await getUser(pathArray[1]);
  }
  else {
    console.log("A Scan is commencing");
    data = await dynamoDb.send(
      new ScanCommand({ TableName: TABLE })
    );
    data = data['Items'];
  }
 
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  
  if ((typeof data) === 'object') {
    response.statusCode = 200;
    switch (request) {
      case 'GET':
        try {
          console.log(event.headers);
          const idToken = event.headers.Authorization;
          console.log("Tried to get idToken");
          if (await verifyIdToken(idToken, pathArray[1])) {
            console.log("Verified User");
            let result = userPath;
            if (pathArray.length >= 1) {
              result = result['entityName'];
              for (let i = 1; i < pathArray.length; i++) {
                result = result[pathArray[i]];
              }
            }
            response.body = JSON.stringify(result);
            console.log(result);
          }
          else {
            console.log("idToken failed");
            throw new TypeError("idToken failed");
          }
          
        }
        catch {
          response.body = 'Invalid Credentials';
          response.statusCode = 401;
        }
      default: 
        response.body = (`Unknown request: ${request}`);
      }
  }
  return response;
}