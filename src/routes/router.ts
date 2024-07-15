import express from 'express';
import multer from 'multer';
import * as Middleware from '../middlewares/middleware';
import * as Controller from '../controllers/controller';

const router = express.Router();
const upload = multer().any();

router.post(
  '/createDataset',
  Middleware.DATASET,
  async (req: any, res: any) => {
    Controller.createDatasets(req, res);
  },
);

router.post(
  '/deleteDataset',
  Middleware.DATASET,
  async (req: any, res: any) => {
    Controller.deleteDataset(req, res);
  },
);

router.post('/datasets',
  async (req: any, res: any) => {
    Controller.getAllDatasets(req, res);
});

router.post('/updateDataset',
  Middleware.UPDATE,
  async (req: any, res: any) => {
    Controller.updateDataset(req, res);
});

router.post(
  '/upload',
  upload,
  Middleware.UPLOAD,
  async (req: any, res: any) => {
    Controller.upload(req, res);
  },
);

router.post('/inference',
  Middleware.INFERENCE,
  async (req: any, res: any) => {
    Controller.addQueue(req, res);
});

router.post('/job',
  Middleware.JOB,
  async (req: any, res: any) => {
    Controller.getJob(req, res);
});

router.post('/results',
  Middleware.JOB,
  async (req: any, res: any) => {
    Controller.getResults(req, res);
});

router.post('/tokens',
  async (req: any, res: any) => {
    Controller.getTokens(req, res);
});

router.post(
  '/recharge',
  Middleware.ADMIN,
  Middleware.RECHARGE,
  async (req: any, res: any) => {
    Controller.recharge(req, res);
  },
);

export default router;
