import app from './app.js'; import { env } from './config/env.js'; app.listen(env.PORT,()=>{console.log(`FALCONS STORE API listening on ${env.PORT}`);});
