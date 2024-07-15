import { Sequelize } from 'sequelize';
import { ErrorFactory, ErrorType } from '../factory/errFactory';
import * as dotenv from 'dotenv';

dotenv.config();

const errFactory = new ErrorFactory();

/**
 * Classe 'SequelizeSingleton'
 *
 * Classe che si occupa di assicurare la presenza di una singola istanza di un oggetto durante il
 * ciclo di vita del servizio. L'oggetto è utilizzato per costruire la connessione al database
 * attraverso la libreria {@link Sequelize}.
 */

export class SequelizeDB {
  private static instance: SequelizeDB;
  private connection: Sequelize;

  private constructor() {
    if (
      !process.env.DB_NAME ||
      !process.env.DB_USER ||
      !process.env.DB_PASS ||
      !process.env.DB_HOST ||
      !process.env.DB_PORT
    ) {
      throw errFactory.createError(ErrorType.MISSING_ENV_VARIABLE);
    }

    this.connection = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASS,
      {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        dialect: 'postgres',
        dialectOptions: {
          useUTC: false, // for reading from database
        },
        timezone: process.env.TZ,
      },
    );
  }

  public static getConnection(): Sequelize {
    if (!SequelizeDB.instance) {
      SequelizeDB.instance = new SequelizeDB();
    }
    return SequelizeDB.instance.connection;
  }
}
