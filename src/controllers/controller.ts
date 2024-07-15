import { ResponseFactory, ResponseType } from '../factory/resFactory';
import { SequelizeDB } from '../singleton/sequelize';
import { ErrorFactory, ErrorType } from '../factory/errFactory';
import { Dataset, createDataset, getAllDataset, getDatasetByName} from '../models/dataset';
import { inferenceQueue } from '../queue/worker';
import { Job } from 'bullmq';
import { Readable } from 'stream';
import { getUserByUsername, User } from '../models/users';
import ffmpeg from 'fluent-ffmpeg';
import AdmZip from 'adm-zip';
import mime from 'mime-types';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ErrorSender from '../utils/error_sender';
import path from 'path';
import * as fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const sendError = new ErrorSender();
const resFactory = new ResponseFactory();
const errFactory = new ErrorFactory();
const sequelize = SequelizeDB.getConnection();

/**
 * Retrieves all datasets for the authenticated user.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function getAllDatasets(req: any, res: any) {
  const user: User = req.user;
  try {
    resFactory.send(
      res,
      undefined,
      await getAllDataset(await user.getUserId()),
    );
  } catch (error: any) {
    sendError.send(res, error);
  }
}

/**
 * Creates a new dataset for the authenticated user.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function createDatasets(req: any, res: any) {
  const transaction = await sequelize.transaction();
  try {
    const nameDataset = req.body.name;
    const user: User = req.user;
    await createDataset(
      {
        nameDataset: nameDataset,
        idCreator: await user.getUserId(),
      },
      transaction,
    );
    const dir = `/usr/app/Datasets/${await user.getUsername()}/${nameDataset}`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    } else {
      throw errFactory.createError(ErrorType.DATASET_MEMORY_EXIST);
    }
    await transaction.commit();
    resFactory.send(res, ResponseType.CREATED);
  } catch (error: any) {
    await transaction.rollback();
    sendError.send(res, error);
  }
}

/**
 * Deletes a dataset for the authenticated user.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function deleteDataset(req: any, res: any) {
  const transaction = await sequelize.transaction();
  try {
    const nameDataset = req.body.name;
    const user: User = req.user;
    const dataset: Dataset = await getDatasetByName(
      nameDataset,
      await user.getUserId(),
    );
    await dataset.deleteDataset(transaction);
    await transaction.commit();
    resFactory.send(res, ResponseType.DELETED);
  } catch (error: any) {
    await transaction.rollback();
    sendError.send(res, error);
  }
}

/**
 * Updates a dataset's name for the authenticated user.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function updateDataset(req: any, res: any) {
  const transaction = await sequelize.transaction();
  try {
    const nameDataset = req.body.name;
    const newName = req.body.new_name;
    const user: User = req.user;
    const dataset: Dataset = await getDatasetByName(
      nameDataset,
      await user.getUserId(),
    );
    const dir = `/usr/app/Datasets/${await user.getUsername()}/${nameDataset}`;
    const newDir = `/usr/app/Datasets/${await user.getUsername()}/${newName}`;
    await dataset.updateDataset(newName, transaction);
    if (fs.existsSync(newDir)) {
      throw errFactory.createError(ErrorType.DATASET_MEMORY_EXIST);
    }
    fs.renameSync(dir, newDir);
    await transaction.commit();
    resFactory.send(res, ResponseType.UPDATED);
  } catch (error: any) {
    await transaction.rollback();
    sendError.send(res, error);
  }
}

/**
 * Creates a unique name by appending a timestamp to the original name.
 * 
 * @param {string} originalName - The original name of the file.
 * @returns {Promise<string>}
 */
async function createUniqueName(originalName: string) {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const timestamp = Date.now();
  return `${baseName}-${timestamp}`;
}

/**
 * Counts and verifies the contents of a zip file.
 * 
 * @param {Buffer} zipBuffer - The buffer of the zip file.
 * @returns {Promise<Object>} An object containing the counts of images and videos.
 */
async function countAndVerifyZip(zipBuffer: Buffer) {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();
  let imgCount = 0;
  let videoCount = 0;

  for (const zipEntry of zipEntries) {
    if (zipEntry.isDirectory) {
      throw errFactory.createError(ErrorType.INVALID_ZIP_FILE);
    }

    const mimetype = mime.lookup(zipEntry.entryName);

    if (!mimetype || mimetype.startsWith('image/')) {
      imgCount++;
    } else if (!mimetype || mimetype === 'video/mp4') {
      const buffer = zipEntry.getData();
      videoCount += await countFrame(buffer);
    } else {
      throw errFactory.createError(ErrorType.INVALID_ZIP_FILE);
    }
  }
  return { videoCount, imgCount };
}

/**
 * Extracts the contents of a zip file to a directory.
 * 
 * @param {Buffer} zipBuffer - The buffer of the zip file.
 * @param {string} dir - The directory to extract the files to.
 * @returns {Promise<void>}
 */
async function extractZip(zipBuffer: Buffer, dir: string) {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  for (const zipEntry of zipEntries) {
    const mimetype = mime.lookup(zipEntry.entryName);

    const buffer = zipEntry.getData();
    const name = zipEntry.name;
    const fileName = await createUniqueName(name);

    if (!mimetype || mimetype.startsWith('image/')) {
      const filePath = path.join(dir, `${fileName}.jpg`);
      fs.writeFileSync(filePath, buffer);
    } else if (!mimetype || mimetype === 'video/mp4') {
      const command = await extractFramesFromVideo(buffer);
      command.save(`${dir}/${fileName}-%03d.png`);
    } else {
      throw errFactory.createError(ErrorType.INVALID_ZIP_FILE);
    }
  }
  return;
}

/**
 * Saves a file to a directory.
 * 
 * @param {string} dir - The directory to save the file to.
 * @param {Object} file - The file to save.
 * @returns {Promise<void>}
 */
async function saveFile(dir: any, file: any) {
  if (file.mimetype === 'video/mp4') {
    const fileName = await createUniqueName(file.originalname);
    const command = await extractFramesFromVideo(file.buffer);
    command.save(`${dir}/${fileName}-%03d.png`);
  } else if (file.mimetype === 'application/zip') {
    await extractZip(file.buffer, dir);
  } else if (file.mimetype.startsWith('image/')) {
    const fileName = await createUniqueName(file.originalname);
    const filePath = path.join(dir, `${fileName}.jpg`);
    fs.writeFileSync(filePath, file.buffer);
  } else {
    throw errFactory.createError(ErrorType.INVALID_FORMAT);
  }
}

/**
 * Counts the number of frames in a video.
 * 
 * @param {Buffer} buffer - The buffer of the video.
 * @returns {Promise<number>}
 */
async function countFrame(buffer: Buffer) {
  const command = await extractFramesFromVideo(buffer);
  let frameCount = 0;
  return new Promise<number>((resolve, reject) => {
    command
      .output('/dev/null')
      .outputOptions('-f null')
      .on('progress', (progress: any) => {
        frameCount = progress.frames;
      })
      .on('end', () => {
        resolve(frameCount);
      })
      .on('error', (err: any) => {
        reject(err);
      })
      .run();
  });
}

/**
 * Extracts frames from a video buffer.
 * 
 * @param {Buffer} videoBuffer - The buffer of the video.
 * @returns {Promise<any>} The ffmpeg command.
 */
async function extractFramesFromVideo(videoBuffer: Buffer) {
  const videoStream = new Readable();
  videoStream.push(videoBuffer);
  videoStream.push(null);
  const command = ffmpeg(videoStream).outputOptions('-vf', 'fps=1');
  return command;
}

/**
 * Uploads files to a dataset.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function upload(req: any, res: any) {
  const transaction = await sequelize.transaction();

  try {
    const datasetName = req.body.name;
    const files = req.files;
    const user: User = req.user;
    const dataset: Dataset = await getDatasetByName(
      datasetName,
      await user.getUserId(),
    );
    const dir = `/usr/app/Datasets/${await user.getUsername()}/${datasetName}`;
    if (!fs.existsSync(dir)) {
      throw errFactory.createError(ErrorType.NO_DATASET_NAME);
    }

    const count = {
      imgCount: 0,
      frameCount: 0,
      zipImgCount: 0,
      zipVideoCount: 0,
    };

    for (const file of files) {
      if (file.mimetype === 'application/zip') {
        const { videoCount, imgCount } = await countAndVerifyZip(file.buffer);
        count.zipVideoCount += videoCount;
        count.zipImgCount += imgCount;
      }
      if (file.mimetype.startsWith('image/')) {
        count.imgCount += 1;
      }
      if (file.mimetype === 'video/mp4') {
        count.frameCount += await countFrame(file.buffer);
      }
    }

    const uploadCost =
      count.frameCount * 0.4 +
      count.imgCount * 0.65 +
      count.zipImgCount * 0.7 +
      count.zipVideoCount * 0.7;

    if (uploadCost > (await user.getBalance())) {
      throw errFactory.createError(ErrorType.INSUFFICIENT_BALANCE);
    }

    const inferenceCost =
      (count.frameCount + count.zipVideoCount) * 1.5 +
      (count.imgCount + count.zipImgCount) * 2.75;
    
    const datasetCost = await dataset.getCost();

    await user.removeTokens(uploadCost, transaction);
    await dataset.updateCost(datasetCost + inferenceCost, transaction);
    for (const file of files) {
      await saveFile(dir, file);
    }
    await transaction.commit();
    resFactory.send(res, ResponseType.UPLOADED);
  } catch (error: any) {
    await transaction.rollback();
    sendError.send(res, error);
  }
}

/**
 * Adds an inference job to the queue.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function addQueue(req: any, res: any) {
  const transaction = await sequelize.transaction();
  try {
    const nameDataset = req.body.dataset;
    const model = req.body.model;
    const camDet = req.body.cam_det;
    const camCls = req.body.cam_cls;
    const user: User = req.user;
    const dataset = await getDatasetByName(nameDataset, await user.getUserId());
    const dir = `/usr/app/Datasets/${await user.getUsername()}/${nameDataset}`;
    const files = fs.readdirSync(dir);
    if (files.length === 0) {
      throw errFactory.createError(ErrorType.DATASET_EMPTY);
    }
    let flag: boolean;
    const datasetCost = await dataset.getCost();
    if ((await user.getBalance()) >= datasetCost) {
      await user.removeTokens(datasetCost, transaction);
      await transaction.commit();
      flag = true;
    } else {
      flag = false;
    }
    const job = await inferenceQueue
      .add('inference', {
        flag,
        user,
        dataset,
        model,
        camDet,
        camCls,
      })
      .catch(() => {
        throw errFactory.createError(ErrorType.ADD_QUEUE_FAILED);
      });
    resFactory.send(res, undefined, {
      message: 'Inference added to queue',
      jobId: job.id,
    });
  } catch (error: any) {
    await transaction.rollback();
    sendError.send(res, error);
  }
}

/**
 * Checks if the authenticated user is the owner of the job.
 * 
 * @param {Job} job - The job to check.
 * @param {User} user - The authenticated user.
 * @returns {Promise<void>}
 */
async function checkJobOwner(job: any, user: User) {
  if ((await user.getUserId()) === job.data.user.idUser) {
    return;
  } else {
    throw errFactory.createError(ErrorType.NOT_OWNER_JOB);
  }
}

/**
 * Retrieves the status of a job.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function getJob(req: any, res: any) {
  try {
    const jobId = req.body.jobId;
    const job: Job | undefined = await inferenceQueue.getJob(jobId);
    if (job === undefined) {
      throw errFactory.createError(ErrorType.JOB_NOT_FOUND);
    }
    await checkJobOwner(job, req.user);
    const flag = job.data.flag;
    if (!flag) {
      resFactory.send(res, ResponseType.ABORTED);
    } else if (await job.isCompleted()) {
      resFactory.send(res, undefined, {
        status: 'COMPLETED',
        results: await job.returnvalue,
      });
    } else if (await job.isFailed()) {
      resFactory.send(res, ResponseType.FAILED);
    } else if (await job.isActive()) {
      resFactory.send(res, ResponseType.RUNNING);
    } else if (await job.isWaiting()) {
      resFactory.send(res, ResponseType.PENDING);
    } else {
      throw errFactory.createError(ErrorType.INTERNAL_ERROR);
    }
  } catch (error: any) {
    sendError.send(res, error);
  }
}

/**
 * Retrieves the results of a completed job.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function getResults(req: any, res: any) {
  const jobId = req.body.jobId;
  try {
    const job: Job | undefined = await inferenceQueue.getJob(jobId);
    if (job === undefined) {
      throw errFactory.createError(ErrorType.JOB_NOT_FOUND);
    }
    const flag = job.data.flag;
    await checkJobOwner(job, req.user);
    if ((await job.isCompleted()) && flag) {
      resFactory.send(res, undefined, {
        status: 'COMPLETED',
        result: await job.returnvalue,
      });
    } else {
      throw errFactory.createError(ErrorType.NOT_COMPLETED_JOB);
    }
  } catch (error: any) {
    sendError.send(res, error);
  }
}

/**
 * Retrieves the token balance for the authenticated user.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function getTokens(req: any, res: any) {
  const user: User = req.user;
  const tokens = await user.getBalance();
  resFactory.send(res, undefined, { tokens });
}

/**
 * Recharges the token balance for a user.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>}
 */
export async function recharge(req: any, res: any) {
  const transaction = await sequelize.transaction();
  try {
    const user: User = await getUserByUsername(req.body.user);
    const tokens = req.body.tokens;
    await user.addTokens(tokens, transaction);
    transaction.commit();
    resFactory.send(res, ResponseType.RECHARGED);
  } catch (error: any) {
    await transaction.rollback();
    sendError.send(res, error);
  }
}
