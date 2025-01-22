import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('validation-middleware');

export const validateRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }

  next();
};

export const validateProfile = (req: Request, res: Response, next: NextFunction) => {
  const { organization, expertise, previousGrants } = req.body;

  // Validate organization
  if (organization) {
    const { name, type, size } = organization;
    if (!name || !type || !size) {
      return res.status(400).json({ 
        message: 'Organization must include name, type, and size' 
      });
    }

    if (!['small', 'medium', 'large'].includes(size)) {
      return res.status(400).json({ 
        message: 'Organization size must be small, medium, or large' 
      });
    }

    if (!['nonprofit', 'academic', 'government', 'private'].includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid organization type' 
      });
    }
  }

  // Validate expertise
  if (expertise) {
    if (!Array.isArray(expertise)) {
      return res.status(400).json({ 
        message: 'Expertise must be an array' 
      });
    }

    if (expertise.some(item => typeof item !== 'string')) {
      return res.status(400).json({ 
        message: 'Expertise items must be strings' 
      });
    }
  }

  // Validate previous grants
  if (previousGrants) {
    if (!Array.isArray(previousGrants)) {
      return res.status(400).json({ 
        message: 'Previous grants must be an array' 
      });
    }

    for (const grant of previousGrants) {
      const { name, amount, year, description } = grant;
      
      if (!name || !amount || !year) {
        return res.status(400).json({ 
          message: 'Each previous grant must include name, amount, and year' 
        });
      }

      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ 
          message: 'Grant amount must be a positive number' 
        });
      }

      if (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()) {
        return res.status(400).json({ 
          message: 'Invalid grant year' 
        });
      }
    }
  }

  next();
};
