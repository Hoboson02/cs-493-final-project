exports.handler = async (event, context, callback) => {
  message = event;
  console.log(event);
  return event;
};