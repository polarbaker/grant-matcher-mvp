import { Router } from 'express';
import { GrantScraper } from '../services/grant-scraper.service';
import { logger } from '../utils/logger';
import { GrantFilters, GrantSector } from '../types/grant.types';
import { SortField, SortOrder } from '../types/filter.types';

export const scrapingRouter = Router();
const grantScraper = new GrantScraper();

scrapingRouter.post('/scrape', async (req, res, next) => {
  try {
    const filters: GrantFilters = {
      sectors: req.body.sectors?.map((s: string) => s as GrantSector),
      amount: req.body.amount && {
        min: req.body.amount.min ? Number(req.body.amount.min) : undefined,
        max: req.body.amount.max ? Number(req.body.amount.max) : undefined,
      },
      deadline: req.body.deadline && {
        start: req.body.deadline.start ? new Date(req.body.deadline.start) : undefined,
        end: req.body.deadline.end ? new Date(req.body.deadline.end) : undefined,
      },
      keywords: req.body.keywords,
      sourceNames: req.body.sourceNames,
    };

    const sortOptions = req.body.sort && {
      field: req.body.sort.field as SortField,
      order: req.body.sort.order as SortOrder,
    };

    const pagination = req.body.pagination && {
      page: Number(req.body.pagination.page) || 1,
      limit: Number(req.body.pagination.limit) || 10,
    };

    logger.info('Starting grant scraping process with:', {
      filters,
      sortOptions,
      pagination
    });

    const { grants, total } = await grantScraper.scrapeAllSources(
      filters,
      sortOptions,
      pagination
    );

    res.json({ 
      success: true, 
      total,
      page: pagination?.page || 1,
      limit: pagination?.limit || total,
      grants 
    });
  } catch (error) {
    next(error);
  }
});

scrapingRouter.get('/sectors', async (req, res, next) => {
  try {
    const sectors = await grantScraper.getSupportedSectors();
    res.json({ 
      success: true, 
      sectors 
    });
  } catch (error) {
    next(error);
  }
});

scrapingRouter.get('/sources', async (req, res, next) => {
  try {
    const sources = await grantScraper.getSourceNames();
    res.json({ 
      success: true, 
      sources 
    });
  } catch (error) {
    next(error);
  }
});

scrapingRouter.get('/presets', async (req, res, next) => {
  try {
    const presets = await grantScraper.getFilterPresets();
    res.json({ 
      success: true, 
      presets 
    });
  } catch (error) {
    next(error);
  }
});

scrapingRouter.get('/preset/:name', async (req, res, next) => {
  try {
    const filters = await grantScraper.applyFilterPreset(req.params.name);
    if (!filters) {
      return res.status(404).json({
        success: false,
        error: 'Preset not found'
      });
    }
    res.json({ 
      success: true, 
      filters 
    });
  } catch (error) {
    next(error);
  }
});
