const {sendFrame, requestQueueName, responseQueueName, stripSlash} = require('./utils');

const setRpcTimeout = (responseQueue, reject, timeout) => {
  if (timeout > 0) {
    setTimeout(
      () => reject(new Error(`RPC response from ${responseQueue} took more then ${timeout} ms, timing out`)),
      timeout
    );
  }
};

class RpcClient {
  constructor(client) {
    this.client = client;
    this.subscriptions = {};
    this.subscribers = {};
    this.id = new Date().getTime();
  }

  getSubscriber(destination) {
    return (correlationId) => {
      const subscriber = (this.subscribers[destination] || {})[correlationId];
      if (subscriber) {
        delete this.subscribers[destination][correlationId];
      }
      return subscriber;
    };
  }

  ensureSubscriptionToResponse(destination) {
    if (!this.subscriptions[destination]) {
      this.subscriptions[destination] = this.subscribeRpcHandler(destination);
    }
  }

  subscribeCaller(responseQueue, correlationId, timeout) {
    return new Promise((resolve, reject) => {
      setRpcTimeout(responseQueue, reject, timeout);
      this.subscribers[responseQueue] = this.subscribers[responseQueue] || {};
      this.subscribers[responseQueue][correlationId] = {resolve, reject};
    });
  }

  subscribeRpcHandler(destination) {
    this.client.subscribe({destination}, (subscriptionError, message) => {
      if (subscriptionError) {
        throw subscriptionError;
      }

      const subscriber = this.getSubscriber(destination)(message.headers.correlationId);
      if (subscriber) {
        message.readString('utf-8', (messageError, responseContent) => {
          if (messageError) {
            subscriber.reject(messageError);
          }
          const body = JSON.parse(responseContent);
          const response = {headers: message.headers, body};
          if (message.headers.ok === 'false') {
            subscriber.reject(response);
          } else {
            subscriber.resolve(response);
          }
        });
      }
    });
  };

  call(method, params, options = {}) {
    method = stripSlash(method);
    const responseQueue = responseQueueName(method, this.id);
    const correlationId = new Date().getTime();

    this.ensureSubscriptionToResponse(responseQueue);

    const {timeout, ...rpcOptions} = options;
    const responsePromise = this.subscribeCaller(responseQueue, correlationId, timeout);

    const sendHeaders = {
      ...rpcOptions,
      destination: requestQueueName(method),
      replyTo: responseQueue,
      correlationId,
    };

    sendFrame(this.client, params, sendHeaders);
    return responsePromise;
  }
}

module.exports = RpcClient;
