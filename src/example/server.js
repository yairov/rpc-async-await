const RpcServer = require('../RpcServer');
const {createClient} = require('../utils');

(async () => {
  const config = {
    host: 'localhost',
    port: 61613,
  };
  const client = await createClient(config);
  const handlers = [
    {
      add: ({body: {number}}) => {
        console.log('[server] add handler');
        return number + 1;
      },
    },
    {
      remove: ({body: {number}}) => {
        console.log('[server] remove handler');
        return number + 1;
      },
    },
  ];

  const rpcServer = new RpcServer(client, handlers);
  rpcServer.start();
})();
