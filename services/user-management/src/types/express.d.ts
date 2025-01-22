declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      [key: string]: any;
    };
  }
}
