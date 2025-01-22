declare module 'multer' {
  import { Request } from 'express';

  interface Multer {
    single(fieldname: string): any;
    array(fieldname: string, maxCount?: number): any;
    fields(fields: Array<{ name: string; maxCount?: number }>): any;
    none(): any;
  }

  interface MulterOptions {
    dest?: string;
    storage?: any;
    limits?: {
      fieldNameSize?: number;
      fieldSize?: number;
      fields?: number;
      fileSize?: number;
      files?: number;
      parts?: number;
      headerPairs?: number;
    };
    fileFilter?(
      req: Request,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void
    ): void;
  }

  function multer(options?: MulterOptions): Multer;

  namespace multer {
    interface DiskStorageOptions {
      destination?: string | ((req: Request, file: Express.Multer.File, callback: (error: Error | null, destination: string) => void) => void);
      filename?(req: Request, file: Express.Multer.File, callback: (error: Error | null, filename: string) => void): void;
    }

    function diskStorage(options: DiskStorageOptions): any;
    function memoryStorage(): any;
  }

  export = multer;
}
