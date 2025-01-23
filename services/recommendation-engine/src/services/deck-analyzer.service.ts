import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { llmService } from './llm.service';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DeckMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  keywords?: string[];
  creationDate?: string;
  fileSize: number;
}

interface ExtractedContent {
  metadata: DeckMetadata;
  textContent: string;
  potentialTopics: string[];
  potentialOrganizations: string[];
}

export class DeckAnalyzerService {
  private readonly organizationPatterns = [
    /(?:^|\s)(?:Inc\.|LLC|Ltd\.|Corp\.|Corporation|Company|Co\.)(?:\s|$)/,
    /(?:^|\s)(?:founded|established|started|launched)(?:\s|by\s|in\s)/i,
  ];

  private readonly topicPatterns = [
    /(?:^|\s)(?:AI|ML|IoT|SaaS|Cloud|Blockchain|FinTech|EdTech|HealthTech)(?:\s|$)/i,
    /(?:^|\s)(?:sustainability|renewable|green|eco-friendly|carbon|climate)(?:\s|$)/i,
    /(?:^|\s)(?:market size|TAM|SAM|SOM)(?:\s|$)/i,
  ];

  private readonly logger = logger;

  async analyze(file: Express.Multer.File) {
    try {
      // Step 1: Extract metadata and text content
      const extractedContent = await this.extractContent(file);
      logger.info('Content extracted from deck', { 
        pageCount: extractedContent.metadata.pageCount,
        contentLength: extractedContent.textContent.length 
      });

      // Step 2: Prepare content for LLM analysis
      const analysisContent = `
Deck Metadata:
- Pages: ${extractedContent.metadata.pageCount}
- Title: ${extractedContent.metadata.title || 'N/A'}
- Author: ${extractedContent.metadata.author || 'N/A'}
- Keywords: ${extractedContent.metadata.keywords?.join(', ') || 'N/A'}
- Creation Date: ${extractedContent.metadata.creationDate || 'N/A'}

Deck Content:
${extractedContent.textContent}

Potential Topics:
${extractedContent.potentialTopics.join('\n')}

Potential Organizations:
${extractedContent.potentialOrganizations.join('\n')}
`;

      // Step 3: Use LLM for deep analysis
      const analysis = await llmService.analyzeDeckContent(analysisContent);

      return {
        ...analysis,
        metadata: extractedContent.metadata
      };
    } catch (error) {
      logger.error('Error analyzing deck:', error);
      throw new AppError(500, 'Failed to analyze deck');
    }
  }

  private async extractContent(file: Express.Multer.File): Promise<ExtractedContent> {
    try {
      // Basic metadata extraction
      const metadata: DeckMetadata = {
        pageCount: 0,
        fileSize: file.size
      };

      let textContent = '';
      const potentialTopics = new Set<string>();
      const potentialOrganizations = new Set<string>();

      if (file.mimetype === 'application/pdf') {
        const pdfDoc = await PDFDocument.load(file.buffer);
        metadata.pageCount = pdfDoc.getPageCount();

        // Extract text content using pdf.js
        const loadingTask = pdfjs.getDocument({ data: file.buffer });
        const pdf = await loadingTask.promise;
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item: TextItem | TextMarkedContent) => {
              if ('str' in item) {
                return item.str;
              }
              return '';
            })
            .join(' ');

          textContent += pageText + '\n';

          // Extract potential topics and organizations using patterns
          this.topicPatterns.forEach(pattern => {
            const matches = pageText.match(pattern);
            if (matches) {
              matches.forEach(match => potentialTopics.add(match.trim()));
            }
          });

          this.organizationPatterns.forEach(pattern => {
            const matches = pageText.match(pattern);
            if (matches) {
              matches.forEach(match => potentialOrganizations.add(match.trim()));
            }
          });
        }

        // Extract PDF metadata if available
        const info = await pdf.getMetadata();
        if (info?.info) {
          const pdfInfo = info.info as Record<string, any>;
          metadata.title = pdfInfo.Title as string;
          metadata.author = pdfInfo.Author as string;
          metadata.keywords = typeof pdfInfo.Keywords === 'string' ? 
            pdfInfo.Keywords.split(',').map((k: string) => k.trim()) : 
            undefined;
          metadata.creationDate = pdfInfo.CreationDate as string;
        }
      } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
        // Handle PPTX files
        // You would need to implement PPTX parsing here
        // Consider using libraries like officegen or mammoth
        throw new AppError(500, 'PPTX analysis not yet implemented');
      }

      return {
        metadata,
        textContent,
        potentialTopics: Array.from(potentialTopics),
        potentialOrganizations: Array.from(potentialOrganizations)
      };
    } catch (error) {
      logger.error('Error extracting content from deck:', error);
      throw new AppError(500, 'Failed to extract content from deck');
    }
  }
}
