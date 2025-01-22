declare module 'cors' {
  import { RequestHandler } from 'express';
  function cors(options?: cors.CorsOptions): RequestHandler;
  namespace cors {
    interface CorsOptions {
      origin?: string | string[] | boolean | ((origin: string, callback: (err: Error | null, allow?: boolean) => void) => void);
      methods?: string | string[];
      allowedHeaders?: string | string[];
      exposedHeaders?: string | string[];
      credentials?: boolean;
      maxAge?: number;
      preflightContinue?: boolean;
      optionsSuccessStatus?: number;
    }
  }
  export = cors;
}
