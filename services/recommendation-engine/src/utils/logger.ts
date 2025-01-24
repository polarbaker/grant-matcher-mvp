import winston from 'winston';
import { performance } from 'perf_hooks';
import DailyRotateFile from 'winston-daily-rotate-file';

const NODE_ENV = process.env.NODE_ENV || 'development';
const logLevel = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');

// Custom log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Level colors for console output
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'gray'
};

// Add colors to winston
winston.addColors(colors);

// Custom format for log messages
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.printf(info => {
    const { timestamp, level, message, metadata, stack } = info;
    const metaStr = Object.keys(metadata as Record<string, unknown>).length ? 
      `\nMetadata: ${JSON.stringify(metadata, null, 2)}` : '';
    const stackStr = stack ? `\nStack: ${stack}` : '';
    
    return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}${stackStr}`;
  })
);

// Console format with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  logFormat
);

// Performance metrics tracking
const metrics = new Map<string, {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
}>();

/**
 * Creates a logger instance with the specified label
 */
export function createLogger(label: string) {
  const logger = winston.createLogger({
    level: logLevel,
    levels,
    format: winston.format.combine(
      winston.format.label({ label }),
      logFormat
    ),
    transports: [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat
      }),
      
      // Rotating file transport for all logs
      new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: logFormat
      }),
      
      // Separate file for errors
      new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormat
      })
    ],
    exitOnError: false
  });

  // Add performance monitoring
  const monitoredLogger = {
    ...logger,
    
    /**
     * Start timing an operation
     */
    startTimer: (operation: string) => {
      const start = performance.now();
      return {
        end: () => {
          const duration = performance.now() - start;
          const metric = metrics.get(operation) || {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: -Infinity
          };
          
          metric.count++;
          metric.totalTime += duration;
          metric.minTime = Math.min(metric.minTime, duration);
          metric.maxTime = Math.max(metric.maxTime, duration);
          
          metrics.set(operation, metric);
          
          logger.debug(`Operation completed: ${operation}`, {
            duration,
            metric
          });
        }
      };
    },

    /**
     * Get performance metrics for all operations
     */
    getMetrics: () => {
      const result: Record<string, {
        count: number;
        avgTime: number;
        minTime: number;
        maxTime: number;
      }> = {};

      metrics.forEach((metric, operation) => {
        result[operation] = {
          count: metric.count,
          avgTime: metric.totalTime / metric.count,
          minTime: metric.minTime,
          maxTime: metric.maxTime
        };
      });

      return result;
    },

    /**
     * Reset performance metrics
     */
    resetMetrics: () => {
      metrics.clear();
    },

    /**
     * Log error with additional context
     */
    errorWithContext: (message: string, error: unknown, context?: Record<string, any>) => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      logger.error(message, {
        error: {
          message: errorObj.message,
          name: errorObj.name,
          stack: errorObj.stack
        },
        ...context
      });
    },

    /**
     * Log HTTP request details
     */
    httpRequest: (req: any, res: any, duration: number) => {
      logger.http(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        ip: req.ip
      });
    }
  };

  return monitoredLogger;
}

// Create default logger
export const logger = createLogger('default');
