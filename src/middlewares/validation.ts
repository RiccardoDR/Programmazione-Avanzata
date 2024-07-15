import { ErrorFactory, ErrorType } from '../factory/errFactory';
import ErrorSender from '../utils/error_sender';

const errFactory = new ErrorFactory();
const sendError = new ErrorSender();

/**
 * Validates if the request body contains all required keys and no additional keys.
 * 
 * @param {Object} body - The request body.
 * @param {string[]} requiredKeys - Array of required keys.
 * @param {Object} res - The response object.
 * @returns {boolean} - Returns true if validation is successful, otherwise false.
 */
function validateRequiredKeys(body: any, requiredKeys: string[], res: any): boolean {
  const bodyKeys = Object.keys(body);
  const hasAllRequiredKeys = requiredKeys.every((key) => bodyKeys.includes(key));
  const hasExactKeys = bodyKeys.length === requiredKeys.length;
  if (!hasAllRequiredKeys || !hasExactKeys) {
    const error = errFactory.createError(ErrorType.INVALID_BODY);
    sendError.send(res, error);
    return false;
  }
  return true;
}

/**
 * Validates if all required keys in the request body are strings and non-empty.
 * 
 * @param {Object} body - The request body.
 * @param {string[]} requiredKeys - Array of required keys.
 * @param {Object} res - The response object.
 * @returns {boolean} - Returns true if validation is successful, otherwise false.
 */
function validateStringKeys(body: any, requiredKeys: string[], res: any): boolean {
  const areValuesValid = requiredKeys.every((key) => typeof body[key] === 'string' && body[key].trim() !== '');
  if (!areValuesValid) {
    const error = errFactory.createError(ErrorType.INVALID_BODY);
    sendError.send(res, error);
    return false;
  }
  return true;
}

/**
 * Validates if all required keys in the request body are numbers and non-negative.
 * 
 * @param {Object} body - The request body.
 * @param {string[]} requiredKeys - Array of required keys.
 * @param {Object} res - The response object.
 * @returns {boolean} - Returns true if validation is successful, otherwise false.
 */
function validateNumberKeys(body: any, requiredKeys: string[], res: any): boolean {
  const areValuesValid = requiredKeys.every((key) => typeof body[key] === 'number' && body[key] >= 0);
  if (!areValuesValid) {
    const error = errFactory.createError(ErrorType.INVALID_BODY);
    sendError.send(res, error);
    return false;
  }
  return true;
}

/**
 * Middleware to validate if the request body is not empty.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateBody(req: any, res: any, next: any): void {
  const body = req.body;
  const bodyKeys = Object.keys(body);
  if (bodyKeys.length === 0) {
    const error = errFactory.createError(ErrorType.MISSING_BODY);
    sendError.send(res, error);
    return;
  }
  next();
}

/**
 * Middleware to validate the request body for creating a dataset.
 * Ensures required keys are present and valid.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateDataset(req: any, res: any, next: any): void {
  const requiredKeys = ['name'];
  if (validateStringKeys(req.body, requiredKeys, res) && validateRequiredKeys(req.body, requiredKeys, res)) {
    next();
  }
  return;
}

/**
 * Middleware to validate the request body for updating a dataset.
 * Ensures required keys are present and valid.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateUpdate(req: any, res: any, next: any): void {
  const requiredKeys = ['name', 'new_name'];
  if (validateStringKeys(req.body, requiredKeys, res) && validateRequiredKeys(req.body, requiredKeys, res)) {
    next();
  }
  return;
}

/**
 * Middleware to validate the request body for inference operations.
 * Ensures required keys are present and valid.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateInference(req: any, res: any, next: any): void {
  const requiredKeys = ['dataset', 'model', 'cam_det', 'cam_cls'];
  if (validateStringKeys(req.body, requiredKeys, res) && validateRequiredKeys(req.body, requiredKeys, res)) {
    next();
  }
  return;
}

/**
 * Middleware to validate the files in the request.
 * Ensures files meet specific criteria for dataset upload.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateFile(req: any, res: any, next: any): void {
  for (const file of req.files) {
    if (!(file.fieldname === 'dataset')) {
      const error = errFactory.createError(ErrorType.INVALID_BODY);
      sendError.send(res, error);
      return;
    }

    const mimetype = file.mimetype;
    const isImage = mimetype.startsWith('image/');
    const isVideo = mimetype === 'video/mp4';
    const isZip = mimetype === 'application/zip';

    if (!isImage && !isZip && !isVideo) {
      const error = errFactory.createError(ErrorType.INVALID_FORMAT);
      sendError.send(res, error);
      return;
    }
  }
  next();
}

/**
 * Middleware to validate the request body for job operations.
 * Ensures required keys are present and valid.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateJob(req: any, res: any, next: any): void {
  const requiredKeys = ['jobId'];
  if (validateNumberKeys(req.body, requiredKeys, res) && validateRequiredKeys(req.body, requiredKeys, res)) {
    next();
  }
  return;
}

/**
 * Middleware to validate the request body for recharge operations.
 * Ensures required keys are present and valid.
 * 
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @returns {void}
 */
export function validateRecharge(req: any, res: any, next: any): void {
  const requiredKeys = ['user', 'tokens'];
  const requiredStringKeys = ['user'];
  const requiredNumberKeys = ['tokens'];
  if (
    validateStringKeys(req.body, requiredStringKeys, res) &&
    validateNumberKeys(req.body, requiredNumberKeys, res) &&
    validateRequiredKeys(req.body, requiredKeys, res)
  ) {
    next();
  }
  return;
}
