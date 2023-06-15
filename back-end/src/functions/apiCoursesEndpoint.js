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

const TABLEData = 'cs-493-final-project-main-data';
const TABLEUser = 'cs-493-final-project-main-users';

async function decodeToken(idToken) {
  if (idToken.includes('Bearer')) {
    idToken = idToken.split(' ');
    idToken = idToken[1];
  }
  console.log(idToken)
  const params = {
    AccessToken: idToken
  };
  try {
    const decoded = jwt.decode(idToken);
    return decoded;
  } catch (error) {
    console.error('An error occurred while calling cognito.getUser:', error);
    return null;
  }
}

async function getGroup(idToken) {
  if (idToken == null) {
    return false;
  }
  let decodedToken = await decodeToken(idToken)
  console.log(decodedToken);
  const group = decodedToken['cognito:groups'];
  console.log(`group: ${group}`)
  return (group)
}

async function getCourse(course) {
  const params = {
    TableName: TABLEData,
    Key: {
      'courses': course
    }
  };
  try {
    const data = await dynamoDb.send(new GetCommand(params));
    return data.Item;
  } catch (error) {
    console.error(error);
  }
}

async function getKeyList(key, isObject) {
  let coursesList;
  const params = {
    TableName: TABLEData,
    ProjectionExpression: key
  };
  try {
    const data = await dynamoDb.send(new ScanCommand(params));
    console.log(data.Items);
    if (isObject){coursesList = data.Items.flatMap((item) => (item[key] ? Object.keys(item[key]) : []));}
    else {coursesList = data.Items.map((item) => item[key]);}
    
    console.log(coursesList);
    return coursesList;
  } catch (err) {
    console.error(err);
  }
}

export const handler = async (event) => {
  let data;
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  const request = event['httpMethod'];
  console.log(request);
  var path = JSON.stringify(event['path']);
  path.replace('"','');
  const pathArray = path.split("/");
  // pathArray.pop()
  pathArray.shift();
  pathArray[pathArray.length-1] = pathArray[pathArray.length-1].replace('\"','');
  if (pathArray[1]) {
    if (pathArray.length == 2) {
      pathArray.push('courseInfo');
    }
    console.log("A get is commencing")
    if (pathArray[2] == 'assignments' && pathArray.length == 2){
      data = await getKeyList(pathArray[2], true);
      response.body = JSON.stringify(data);
      response.statusCode = 200;
    }
    else{
      data = await getCourse(pathArray[1]);
      if ((typeof data) === 'object') {
        response.statusCode = 200;
        console.log(request);
        switch (request) {
          case 'GET':
            console.log(`${pathArray.length} : ${pathArray}`);
            if (pathArray.length >= 3) {
              console.log(JSON.stringify(data));
              for (let i = 2; i < pathArray.length; i++) {
                console.log(JSON.stringify(data[pathArray[i]]));
                data = data[pathArray[i]];
              }
            }
            response.body = JSON.stringify(data);
            console.log(response);
            break;
          case 'POST':
            response.body = request;
            break;
          case 'DELETE':
            const idToken = event.headers.Authorization;
            let group = await getGroup(idToken);
            if (1 == 1) { // group && group.includes('Admin')
              response.body = JSON.stringify({ message: 'Unauthorized' });
              response.statusCode = 200;
              if (pathArray.length === 2) {
                // Delete entire row of data
                const key = {};
                key[pathArray[0]] = pathArray[1];
                const params = {
                  TableName: TABLEData,
                  Key: key
                };
                try {
                  await dynamoDb.send(new DeleteCommand(params));
                  response.body = JSON.stringify({ message: 'Delete operation successful' });
                } catch (error) {
                  console.error('An error occurred while calling dynamoDb.send:', error);
                  response.body = JSON.stringify({ message: 'Delete operation failed' });
                }
              } else if (pathArray.length === 4 && pathArray[2] === 'assignments') {
                // Delete specific assignment
                const key = {};
                key[pathArray[0]] = pathArray[1];
                const getParams = {
                  TableName: TABLEData,
                  Key: key
                };
                try {
                  const result = await dynamoDb.send(new GetCommand(getParams));
                  if (result.Item) {
                    const assignments = result.Item.assignments;
                    delete assignments[pathArray[3]];
                    const updateParams = {
                      TableName: TABLEData,
                      Key: key,
                      UpdateExpression: 'SET assignments = :assignments',
                      ExpressionAttributeValues: {
                        ':assignments': assignments
                      }
                    };
                    await dynamoDb.send(new UpdateCommand(updateParams));
                    response.body = JSON.stringify({ message: 'Delete operation successful' });
                  } else {
                    response.body = JSON.stringify({ message: 'Item not found' });
                  }
                } catch (error) {
                  console.error('An error occurred while calling dynamoDb.send:', error);
                  response.body = JSON.stringify({ message: 'Delete operation failed' });
                }
              } else {
                response.body = JSON.stringify({ message: 'Invalid pathArray' });
              }
            } else {
              response.body = JSON.stringify({ message: 'Unauthorized' });
            }
            break;
          default: 
            response.body = (`Unknown request: ${request}`);
        }
      }
    }
  }
  else {
    data = await getKeyList('courses', false);
    response.body = JSON.stringify(data);
    response.statusCode = 200;
  }
  return response;
}