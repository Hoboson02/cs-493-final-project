const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
const jwt = require('jsonwebtoken');
const client = new DynamoDBClient({region: 'us-west-2'});

const dynamoDb = DynamoDBDocumentClient.from(client);
const USERData = 'cs-493-final-project-main-users';

async function getSub(username, userPoolId) {
  const params = {
    UserPoolId: userPoolId,
    Filter: `username = "${username}"`,
    Limit: 1
  };

  try {
    const response = await cognito.listUsers(params).promise();
    if (response.Users.length > 0) {
      const user = response.Users[0];
      const subAttribute = user.Attributes.find(attribute => attribute.Name === 'sub');
      console.log(subAttribute.Value);
      return subAttribute.Value;
    }
  } catch (err) {
    console.error(err);
  }
}

async function addUser(tableName, userId, newUserGroup) {
  const params = {
    TableName: tableName,
    Item: {
      "users": userId,
      "courseIDs": [],
      "role": newUserGroup
    }
  };
  try {
    await docClient.put(params).promise();
    console.log(`Added user ${userId} to ${tableName}`);
  } catch (error) {
    console.error(error);
  }
}

async function decodeToken(idToken) {
  if (idToken.includes('Bearer')) {
    idToken = idToken.split(' ');
    idToken = idToken[1];
  }
  console.log(idToken)
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
  
  const userId = decodedToken.sub;
  console.log(`User ID: ${userId}`)
  const params = {
    TableName: USERData,
    Key: {
      'users': userId
    },
      ProjectExpression: "role"
  };
  try {
    const data = await dynamoDb.send(new GetCommand(params));
    return data.Item.role;
    } catch (error) {
    console.error(error);
    }
  }

exports.handler = async (event) => {
  let defaultGroup = 'Student';
  const response = {
    isBase64Encoded: false,
    headers: {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'}
  };
  const body = JSON.parse(event.body);
  const submitterToken = event.headers.Authorization;
  const { username, password, newUserGroup } = body;
  const userPoolId = 'us-west-2_IoBo5jDL6';
  const clientId = '1agtrq9sqmodapdq850m9i205n';
  let submitterGroup = await getGroup(submitterToken);
  console.log(submitterGroup);
  if ((newUserGroup == 'Student' || submitterGroup == 'Admin') || (submitterGroup == 'Instructor' && newUserGroup == 'Student')) {
    try {
      await cognito.signUp({
        ClientId: clientId,
        Username: username,
        Password: password,
      }).promise();
    } catch (error){
      console.error(error)
      response.statusCode = 403;
      response.body = JSON.stringify({message: "User with that name already exists"});
      return response
    }
    try {
      await cognito.adminConfirmSignUp({
        UserPoolId: userPoolId,
        Username: username
      }).promise();
      await cognito.adminAddUserToGroup({
        GroupName: newUserGroup,
        UserPoolId: userPoolId,
        Username: username
      }).promise();
      const uuid = await getSub(username, userPoolId)
      await addUser('cs-493-final-project-main-users', uuid, newUserGroup);
      response.statusCode = 201;
      response.body = JSON.stringify({message: `Thank you ${username} for registering`});
      return response;
    } catch (error) {
      console.error(error);
      response.statusCode = 403;
      return response;
    }
  }
  else {
    response.statusCode = 403;
    response.body = JSON.stringify({message: "You are not authorized to be able to create this type of user"});
    return response;
  }
};