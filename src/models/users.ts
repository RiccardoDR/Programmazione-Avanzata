import { DataTypes, Model, Transaction } from 'sequelize';
import { SequelizeDB } from '../singleton/sequelize';
import { ErrorFactory, ErrorType } from '../factory/errFactory';

const sequelize = SequelizeDB.getConnection();
const errorHandler = new ErrorFactory();

/**
 * Represents a User.
 * 
 * @class
 * @extends {Model}
 */
class User extends Model {
  private idUser!: number;
  private username!: string;
  private email!: string;
  private role!: 'ADMIN' | 'USER';
  private tokens!: number;

  /**
   * Gets the ID of the user.
   * 
   * @returns {Promise<number>} The ID of the user.
   */
  async getUserId() {
    return this.idUser;
  }

  /**
   * Gets the username of the user.
   * 
   * @returns {Promise<string>} The username of the user.
   */
  async getUsername() {
    return this.username;
  }

  /**
   * Gets the role of the user.
   * 
   * @returns {Promise<string>} The role of the user.
   */
  async getRole() {
    return this.role;
  }

  /**
   * Gets the balance of tokens of the user.
   * 
   * @returns {Promise<number>} The balance of tokens.
   */
  async getBalance() {
    return this.tokens;
  }

  /**
   * Adds tokens to the user's balance.
   * 
   * @param {number} tokens - The number of tokens to add.
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<void>}
   */
  async addTokens(tokens: number, transaction: Transaction) {
    const data = { tokens: this.tokens + tokens };
    await this.update(data, {
      transaction,
    }).catch(() => {
      throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
    });
  }

  /**
   * Removes tokens from the user's balance.
   * 
   * @param {number} tokens - The number of tokens to remove.
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<void>}
   */
  async removeTokens(tokens: number, transaction: Transaction) {
    const data = { tokens: this.tokens - tokens };
    await this.update(data, {
      transaction,
    }).catch(() => {
      throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
    });
  }
}

User.init(
  {
    idUser: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_user",
    },
    username: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
    email: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM,
      values: ['ADMIN', 'USER'],
      defaultValue: 'USER',
      allowNull: false,
    },
    tokens: {
      type: DataTypes.REAL,
      defaultValue: 10,
    },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: false,
    freezeTableName: true,
  },
);

/**
 * Gets a user by their ID.
 * 
 * @param {number} idUser - The ID of the user.
 * @returns {Promise<User>} The user.
 */
async function getUserById(idUser: number): Promise<User> {
  const user = await User.findByPk(idUser).catch(() => {
    throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
  });
  if (!user) {
    throw errorHandler.createError(ErrorType.USER_NOT_FOUND);
  }
  return user;
}

/**
 * Gets a user by their username.
 * 
 * @param {string} username - The username of the user.
 * @returns {Promise<User>} The user.
 */
async function getUserByUsername(username: string): Promise<User> {
  const user = await User.findOne({
    where: { username },
  }).catch(() => {
    throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
  });
  if (!user) {
    throw errorHandler.createError(ErrorType.USER_NOT_FOUND);
  }
  return user;
}

/**
 * Gets all users.
 * 
 * @returns {Promise<User[]>} The list of users.
 */
async function getAllUsers() {
  const users = await User.findAll().catch(() => {
    throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
  });
  if (!users || users.length === 0) {
    throw errorHandler.createError(ErrorType.NO_USER);
  }
  return users;
}

export { User, getUserById, getUserByUsername, getAllUsers };
