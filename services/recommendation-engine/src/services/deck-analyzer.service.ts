import * as pdfjs from 'pdfjs-dist';
import { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { createLogger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { LLMService } from './llm.service';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface DeckMetadata {
  pageCount: number;
  fileType: string;
  fileSize: number;
}

interface ExtractedContent {
  metadata: DeckMetadata;
  textContent: string;
  potentialOrganizations: string[];
}

export class DeckAnalyzerService {
  private readonly logger = createLogger('DeckAnalyzerService');
  private readonly llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  async analyze(file: Express.Multer.File) {
    try {
      // Step 1: Extract content from the deck
      const extractedContent = await this.extractContent(file);
      this.logger.info('Content extracted from deck', { 
        pageCount: extractedContent.metadata.pageCount,
        contentLength: extractedContent.textContent.length 
      });

      // Step 2: Prepare content for analysis
      const analysisContent = `
        Organization Information:
        ${extractedContent.textContent}

        Potential Organizations:
        ${extractedContent.potentialOrganizations.join('\n')}

        Metadata:
        Page Count: ${extractedContent.metadata.pageCount}
        File Type: ${file.mimetype}
        File Size: ${file.size} bytes
      `;

      // Step 3: Use LLM for deep analysis
      const analysis = await this.llmService.analyzeDeckContent(analysisContent);

      return {
        ...analysis,
        metadata: extractedContent.metadata
      };
    } catch (error) {
      this.logger.error('Error analyzing deck:', error);
      throw new AppError(500, 'Failed to analyze deck');
    }
  }

  private async extractContent(file: Express.Multer.File): Promise<ExtractedContent> {
    try {
      const pdfData = new Uint8Array(file.buffer);
      const loadingTask = pdfjs.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      let textContent = '';
      const potentialOrganizations = new Set<string>();
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const content = await page.getTextContent();
        
        for (const item of content.items) {
          const textItem = item as TextItem | TextMarkedContent;
          if ('str' in textItem) {
            textContent += textItem.str + ' ';
            
            // Look for potential organization names
            if (this.isPotentialOrgName(textItem.str)) {
              potentialOrganizations.add(textItem.str.trim());
            }
          }
        }
      }

      return {
        textContent: textContent.trim(),
        metadata: {
          pageCount: pdf.numPages,
          fileType: file.mimetype,
          fileSize: file.size
        },
        potentialOrganizations: Array.from(potentialOrganizations)
      };
    } catch (error) {
      this.logger.error('Error extracting content from deck:', error);
      throw new AppError(500, 'Failed to extract content from deck');
    }
  }

  private isPotentialOrgName(text: string): boolean {
    // Simple heuristic for now - can be improved
    const words = text.trim().split(/\s+/);
    return (
      words.length >= 2 &&
      words.length <= 5 &&
      /^[A-Z]/.test(text) && // Starts with capital letter
      !/^(The|A|An)\s/i.test(text) && // Doesn't start with articles
      !/\d/.test(text) // Doesn't contain numbers
    );
  }
}
