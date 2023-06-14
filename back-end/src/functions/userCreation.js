const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

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
      return subAttribute.Value;
    }
  } catch (err) {
    console.error(err);
  }
}

async function addUser(tableName, userId, defaultGroup) {
  const params = {
    TableName: tableName,
    Item: {
      "users": userId,
      "courseIDs": [],
      "role": defaultGroup
    }
  };
  try {
    await docClient.put(params).promise();
    console.log(`Added user ${userId} to ${tableName}`);
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
  const { username, password } = body;
  const userPoolId = 'us-west-2_IoBo5jDL6';
  const clientId = '1agtrq9sqmodapdq850m9i205n';
  try {
    await cognito.signUp({
      ClientId: clientId,
      Username: username,
      Password: password,
    }).promise();
  } catch (error){
    console.error(error)
    response.statusCode = 400;
    response.body = JSON.stringify({message: "User with that name already exists"});
    return response
  }
  try {
    await cognito.adminConfirmSignUp({
      UserPoolId: userPoolId,
      Username: username
    }).promise();
    await cognito.adminAddUserToGroup({
      GroupName: defaultGroup,
      UserPoolId: userPoolId,
      Username: username
    }).promise();
    uuid = await getSub(username, userPoolId)
    await addUser('cs-493-final-project-main-users', uuid, defaultGroup);
    response.statusCode = 200;
    response.body = JSON.stringify({message: `Thank you ${username} for registering`});
    return response;
  } catch (error) {
    console.error(error);
    response.statusCode = 400;
    return response;
  }
};