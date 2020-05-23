const {requestQueueName, sendFrame} = require('./utils');

class RpcServer {
  constructor(client, handlers) {
    this.client = client;
    this.handlers = handlers || [];
  }

  subscribeToRpc(destination, handler) {
    console.log(`[RpcServer] subscribing ${destination}`);
    this.client.subscribe({destination}, (error, message) => {
      if (!error) {
        message.readString('utf-8', (parseError, body) => {
          if (!parseError) {
            console.log('[RpcServer] rpc received', {destination, body});
            this.respondToRpc(this.client, message, handler, JSON.parse(body));
          }
        });
      }
    });
  }

  respondToRpc(client, message, handler, body) {
    return new Promise((resolve, reject) => {
      const {replyTo: destination, ...rest} = message.headers;
      const headers = {...rest, destination};
      Promise.resolve()
        .then(() => handler({body, headers}))
        .then((response) => {
          console.log('[RpcServer] rpc sent', {response});
          const successHeaders = {...headers, ok: true};
          sendFrame(client, response, successHeaders);
          resolve({headers: successHeaders, response});
        })
        .catch((handlerError) => {
          console.log('[RpcServer] rpc error', {handlerError});
          const failureHeaders = {...headers, ok: false};
          sendFrame(client, {message: handlerError.message}, failureHeaders);
          reject(handlerError);
        });
    });
  }

  start() {
    this.handlers.forEach((item) => {
      const [[origin, handler]] = Object.entries(item);
      const destination = requestQueueName(origin);
      this.subscribeToRpc(destination, handler);
    });
  }
}

module.exports = RpcServer;
