const stompit = require('stompit');

const requestQueueName = method => `request/${method}`;
const responseQueueName = (method, id) => `response/${method}/${id}/reply`;

const stripSlash = method => (method[0] === '/' ? method.substr(1) : method);

const sendFrame = (client, message, headers) => {
  const frame = client.send(headers);
  frame.write(JSON.stringify(message));
  frame.end();
};

const createClient = async (connectionConfig) => new Promise((resolve, reject) => stompit.connect(connectionConfig, (error, client) => (error ? reject(error) : resolve(client))));

module.exports = {
  requestQueueName,
  responseQueueName,
  stripSlash,
  sendFrame,
  createClient,
};
