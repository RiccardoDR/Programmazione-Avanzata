import { SequelizeDB } from './singleton/sequelize';
import { ErrorFactory, ErrorType } from './factory/errFactory';
import express from 'express';
import router from './routes/router';
import ErrorSender from './utils/error_sender';
import * as Middleware from './middlewares/middleware';
import * as dotenv from 'dotenv';

dotenv.config();

const sequelize = SequelizeDB.getConnection();
const errFactory = new ErrorFactory();
const sendError = new ErrorSender();

const app = express();
const port = process.env.API_PORT;

app.use(express.json());
app.use(Middleware.AUTH);
app.use(router);
app.use('*', (_req, res) => {
  const err = errFactory.createError(ErrorType.ROUTE_NOT_FOUND);
  sendError.send(res, err);
});

app.listen(port, () => {
  console.log(`App in ascolto sulla porta ${port}...`);
  sequelize.sync().then(() => {
    console.log('Tabelle sincronizzate.');
  });
});
