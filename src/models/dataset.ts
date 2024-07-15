import { DataTypes, Model, Transaction } from 'sequelize';
import { SequelizeDB } from '../singleton/sequelize';
import { User } from './users';
import { ErrorFactory, ErrorType } from '../factory/errFactory';

const sequelize = SequelizeDB.getConnection();
const errorHandler = new ErrorFactory();

/**
 * Represents a Dataset.
 * 
 * @class
 * @extends {Model}
 */
class Dataset extends Model {
  private idDataset!: number;
  private cost!: number;
  private nameDataset!: string;
  private idCreator!: number;

  /**
   * Gets the cost of the dataset.
   * 
   * @returns {Promise<number>} The cost of the dataset.
   */
  async getCost() {
    return this.cost;
  }

  /**
   * Gets the name of the dataset.
   * 
   * @returns {Promise<string>} The name of the dataset.
   */
  async getName() {
    return this.nameDataset;
  }

  /**
   * Updates the cost of the dataset.
   * 
   * @param {number} newCost - The new cost of the dataset.
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<void>}
   */
  async updateCost(newCost: number, transaction: Transaction) {
    const data = { cost: newCost };
    await this.update(data, {
      transaction,
    }).catch(() => {
      throw errorHandler.createError(ErrorType.UPDATE_COST_FAILED);
    });
  }

  /**
   * Deletes the dataset.
   * 
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<void>}
   */
  async deleteDataset(transaction: Transaction) {
    await this.destroy({
      transaction,
    }).catch(() => {
      throw errorHandler.createError(ErrorType.DATASET_DELETION_FAILED);
    });
  }

  /**
   * Updates the name of the dataset.
   * 
   * @param {string} newName - The new name of the dataset.
   * @param {Transaction} transaction - The transaction object.
   * @returns {Promise<void>}
   */
  async updateDataset(newName: string, transaction: Transaction) {
    const dataset = await Dataset.findOne({
      where: {
        nameDataset: newName,
        idCreator: this.idCreator,
      },
    }).catch(() => {
      throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
    });
    if (dataset) {
      throw errorHandler.createError(ErrorType.DATASET_ALREADY_EXIST);
    }
    const data = { nameDataset: newName };
    await this.update(data, {
      transaction,
    }).catch(() => {
      throw errorHandler.createError(ErrorType.DATASET_DELETION_FAILED);
    });
  }
}

Dataset.init(
  {
    idDataset: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id_dataset",
    },
    cost: {
      type: DataTypes.REAL,
      defaultValue: 0,
    },
    nameDataset: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "name_dataset",
    },
    idCreator: {
      type: DataTypes.INTEGER,
      references: {
        model: User,
        key: 'idUser',
      },
      field: "id_creator",
    },
  },
  {
    sequelize,
    tableName: 'dataset',
    timestamps: false,
    freezeTableName: true,
  },
);

/**
 * Creates a new dataset.
 * 
 * @param {Object} data - The dataset data.
 * @param {string} data.nameDataset - The name of the dataset.
 * @param {number} data.idCreator - The ID of the creator.
 * @param {Transaction} transaction - The transaction object.
 * @returns {Promise<void>}
 */
async function createDataset(data: any, transaction: Transaction) {
  const datasets = await Dataset.findOne({
    where: data,
  }).catch(() => {
    throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
  });
  if (datasets) {
    throw errorHandler.createError(ErrorType.DATASET_ALREADY_EXIST);
  } else {
    await Dataset.create(data, {
      transaction,
    }).catch(() => {
      throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
    });
  }
}

/**
 * Gets a dataset by its name.
 * 
 * @param {string} name - The name of the dataset.
 * @param {number} idUser - The ID of the user.
 * @returns {Promise<Dataset>} The dataset.
 */
async function getDatasetByName(name: string, idUser: number) {
  const dataset = await Dataset.findOne({
    where: {
      nameDataset: name,
      idCreator: idUser,
    },
  }).catch(() => {
    throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
  });
  if (!dataset) {
    throw errorHandler.createError(ErrorType.NO_DATASET_NAME);
  }
  return dataset;
}

/**
 * Gets all datasets for a user.
 * 
 * @param {number} idUser - The ID of the user.
 * @returns {Promise<Dataset[]>} The list of datasets.
 */
async function getAllDataset(idUser: number) {
  const datasets = await Dataset.findAll({
    where: {
      idCreator: idUser,
    },
    attributes: [
      'nameDataset',
      'cost',
    ],
  }).catch(() => {
    throw errorHandler.createError(ErrorType.INTERNAL_ERROR);
  });
  if (datasets.length === 0) {
    throw errorHandler.createError(ErrorType.NO_DATASETS);
  }
  return datasets;
}

export { Dataset, createDataset, getDatasetByName, getAllDataset };
