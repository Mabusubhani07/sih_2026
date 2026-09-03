import app from '../server/src/index';

export default (req: any, res: any) => {
  return app(req, res);
};
