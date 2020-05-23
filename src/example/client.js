const {createClient} = require('../utils');
const RpcClient = require('../RpcClient');

(async () => {
  const config = {
    host: 'localhost',
    port: 61613,
  };
  const client = await createClient(config);
  const rpcClient = new RpcClient(client);
  const rpc = (method, body = {}, headers = {}) => rpcClient.call(method, body, {...{timeout: 3000}, headers});

  try {
    const {body} = await rpc('/add', {number: 1});
    console.log('[client]', {body});
  } catch (e) {
    console.error('[client] error', e);
  }

  try {
    const {body} = await rpc('/remove', {number: 2});
    console.log('[client]', {body});
  } catch (e) {
    console.error(e);
  }
})();
