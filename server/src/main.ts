import { createApp } from './app.js';
import { serverConfig } from './config.js';
import { assertStartupConfig } from './startup.js';

// If env vars are missing, ensure you load the .env file:
//   node --env-file=server/.env dist/server/src/main.js
assertStartupConfig();

const app = createApp();
const port = Number(process.env.PORT ?? 3002);

app.listen(port, () => {
  console.log(`Aldor server listening on ${port} (${serverConfig.serverBaseUrl})`);
  console.log(`Payment mode: ${serverConfig.paymentMode} | Cluster: ${serverConfig.solanaCluster} | Umbra: ${serverConfig.umbraEnabled}`);
});
