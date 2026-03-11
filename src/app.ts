import express from 'express';
import cookieParser from 'cookie-parser';

import config from './config/config.js';

const app = express();

app.use(cookieParser());
app.use(express.json());



app.listen(config.port, () => {
  console.log(`Server running at port ${config.port}...`);
});


