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

const TABLE = 'cs-493-final-project-main-data';

async function getCourse(course) {
  const params = {
    TableName: TABLE,
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

async function getCourseList() {
  const params = {
    TableName: TABLE,
    ProjectionExpression: 'courses'
  };
  try {
    const data = await dynamoDb.send(new ScanCommand(params));
    const coursesList = data.Items.map((item) => item.courses);
    console.log(coursesList);
    return coursesList;
  } catch (err) {
    console.error(err);
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
    data = await getCourse(pathArray[1]);
  }
  else {
    data = await getCourseList();
  }
 
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  
  if ((typeof data) === 'object') {
    response.statusCode = 200;
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
        response.body = request;
        break;
      default: 
        response.body = (`Unknown request: ${request}`);
    }
  }
  return response;
}