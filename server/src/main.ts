import { createApp } from './app.js';
import { serverConfig } from './config.js';
import { assertStartupConfig } from './startup.js';

assertStartupConfig();

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Aldor server listening on ${port} (${serverConfig.serverBaseUrl})`);
});
