from typing import List
import spacy
from fastapi import UploadFile
from .text_extractor import extract_text

async def process_document(file: UploadFile) -> str:
    """Process the uploaded document and extract text."""
    try:
        # Read the file content
        content = await file.read()
        
        # Extract text from the PDF
        text = await extract_text(content)
        
        # Process the extracted text
        nlp = spacy.load("en_core_web_sm")
        doc = nlp(text)
        
        # Extract sentences
        sentences = [sent.text.strip() for sent in doc.sents]
        
        return "\n".join(sentences)
        
    except Exception as e:
        raise Exception(f"Error processing document: {str(e)}")
        
    finally:
        # Reset file pointer for potential future reads
        await file.seek(0)
