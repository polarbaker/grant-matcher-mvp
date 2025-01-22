import winston from 'winston';
import path from 'path';

const createLogger = (serviceName: string) => {
  const logDir = path.join(process.cwd(), 'logs');
  
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log')
      }),
      new winston.transports.Console({
        format: winston.format.simple(),
      })
    ]
  });
};

export default createLogger;
