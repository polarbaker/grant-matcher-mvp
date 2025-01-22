import { parse as parseHtmlEntities } from 'html-entities';
import { GrantAmount } from '../types/grant.types';
import * as chrono from 'chrono-node';
import sanitizeHtmlLib from 'sanitize-html';

/**
 * Sanitizes HTML content by removing unwanted tags and attributes
 */
export function sanitizeHtml(html: string): string {
  const cleaned = sanitizeHtmlLib(html, {
    allowedTags: [], // Strip all HTML tags
    allowedAttributes: {}, // Strip all attributes
    textFilter: function(text) {
      return parseHtmlEntities(text).trim();
    }
  });
  
  // Remove extra whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts amount information from a string
 * Handles various formats like:
 * - "Up to $50,000"
 * - "$10,000 - $50,000"
 * - "50K USD"
 * - "1.5M"
 */
export function extractAmount(text: string): GrantAmount | null {
  if (!text) return null;

  // Convert text to lowercase and remove whitespace
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  
  // Initialize amount object
  let amount: GrantAmount = {
    min: 0,
    max: 0,
    currency: 'USD' // Default currency
  };

  // Extract currency
  const currencyMatch = text.match(/(?:USD|EUR|GBP|CAD|AUD)/i);
  if (currencyMatch) {
    amount.currency = currencyMatch[0].toUpperCase();
  }

  // Convert K/M to actual numbers
  const convertToNumber = (str: string): number => {
    str = str.replace(/[,$]/g, '');
    if (str.endsWith('k')) {
      return parseFloat(str) * 1000;
    } else if (str.endsWith('m')) {
      return parseFloat(str) * 1000000;
    }
    return parseFloat(str);
  };

  // Try to match different amount patterns
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?(?:k|m)?)\s*-\s*(\d+(?:\.\d+)?(?:k|m)?)/i);
  const upToMatch = normalized.match(/upto(\d+(?:\.\d+)?(?:k|m)?)/i);
  const singleMatch = normalized.match(/(\d+(?:\.\d+)?(?:k|m)?)/i);

  if (rangeMatch) {
    amount.min = convertToNumber(rangeMatch[1]);
    amount.max = convertToNumber(rangeMatch[2]);
  } else if (upToMatch) {
    amount.min = 0;
    amount.max = convertToNumber(upToMatch[1]);
  } else if (singleMatch) {
    const value = convertToNumber(singleMatch[1]);
    amount.min = value;
    amount.max = value;
  } else {
    return null;
  }

  // Validate the extracted amounts
  if (isNaN(amount.min) || isNaN(amount.max) || amount.min < 0 || amount.max < 0) {
    return null;
  }

  // Ensure min is not greater than max
  if (amount.min > amount.max) {
    [amount.min, amount.max] = [amount.max, amount.min];
  }

  return amount;
}

/**
 * Parses date strings into Date objects
 * Handles various formats and relative dates
 */
export function parseDate(text: string): Date | null {
  if (!text) return null;

  try {
    // Remove common prefixes/suffixes that might confuse the parser
    const cleaned = text.replace(/^(deadline|due|closes|ends):/i, '')
                       .replace(/(deadline|due|closes|ends)$/i, '')
                       .trim();

    // Try parsing with chrono-node
    const results = chrono.parse(cleaned, new Date(), { forwardDate: true });
    
    if (results.length > 0) {
      const parsed = results[0].start.date();
      
      // Validate the parsed date
      if (parsed instanceof Date && !isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    // Fallback to direct Date parsing if chrono fails
    const directParse = new Date(cleaned);
    if (!isNaN(directParse.getTime())) {
      return directParse;
    }

    return null;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
}

/**
 * Extracts keywords from text while filtering out common words
 */
export function extractKeywords(text: string): string[] {
  if (!text) return [];

  // Common words to filter out
  const stopWords = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'were', 'will', 'with'
  ]);

  return text.toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .split(/\s+/) // Split into words
    .filter(word => 
      word.length > 2 && // Filter out short words
      !stopWords.has(word) && // Filter out stop words
      !(/^\d+$/.test(word)) // Filter out numbers
    );
}

/**
 * Extracts organization types from text
 */
export function extractOrganizationTypes(text: string): string[] {
  const orgTypes = [
    'nonprofit',
    'non-profit',
    'for-profit',
    'government',
    'educational',
    'university',
    'research',
    'small business',
    'startup',
    'corporation',
    'individual',
    'partnership',
    'LLC',
    'institution'
  ];

  const found = new Set<string>();
  const lowerText = text.toLowerCase();

  for (const type of orgTypes) {
    if (lowerText.includes(type)) {
      found.add(type);
    }
  }

  return Array.from(found);
}

/**
 * Extracts requirements from text
 */
export function extractRequirements(text: string): string[] {
  const requirements: string[] = [];
  const lines = text.split(/[.;\n]/);

  const requirementIndicators = [
    'must',
    'should',
    'required',
    'requirement',
    'eligible',
    'eligibility',
    'qualify',
    'qualification'
  ];

  for (const line of lines) {
    const cleaned = line.trim();
    if (
      cleaned &&
      requirementIndicators.some(indicator => 
        cleaned.toLowerCase().includes(indicator)
      )
    ) {
      requirements.push(cleaned);
    }
  }

  return requirements;
}

/**
 * Extracts contact information from text
 */
export function extractContactInfo(text: string): string | null {
  // Email pattern
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  
  // Phone pattern (various formats)
  const phonePattern = /(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/;
  
  // Website pattern
  const websitePattern = /https?:\/\/[^\s<>]+/;

  const email = text.match(emailPattern);
  const phone = text.match(phonePattern);
  const website = text.match(websitePattern);

  const contactInfo = [];
  
  if (email) contactInfo.push(`Email: ${email[0]}`);
  if (phone) contactInfo.push(`Phone: ${phone[0]}`);
  if (website) contactInfo.push(`Website: ${website[0]}`);

  return contactInfo.length > 0 ? contactInfo.join(' | ') : null;
}
