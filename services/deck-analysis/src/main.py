from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import os
import spacy
from transformers import pipeline
from .utils.document_processor import process_document
from .utils.text_extractor import extract_text
from .models.analysis import DeckAnalysis

app = FastAPI(title="Deck Analysis Service")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load NLP models
nlp = spacy.load("en_core_web_sm")
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")

@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    app.mongodb = app.mongodb_client.grantmatcher

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

@app.post("/api/analyze", response_model=DeckAnalysis)
async def analyze_deck(file: UploadFile = File(...)):
    """
    Analyze uploaded pitch deck and extract key information
    """
    try:
        # Process document and extract text
        text = await process_document(file)
        
        # Extract key information using spaCy
        doc = nlp(text)
        
        # Extract entities
        entities = {
            "organizations": [],
            "products": [],
            "technologies": [],
            "markets": []
        }
        
        for ent in doc.ents:
            if ent.label_ == "ORG":
                entities["organizations"].append(ent.text)
            elif ent.label_ == "PRODUCT":
                entities["products"].append(ent.text)
            
        # Generate summary
        summary = summarizer(text, max_length=130, min_length=30, do_sample=False)
        
        # Create analysis result
        analysis = {
            "summary": summary[0]["summary_text"],
            "entities": entities,
            "key_topics": extract_key_topics(doc),
            "document_type": file.content_type,
            "filename": file.filename
        }
        
        # Store analysis in MongoDB
        await app.mongodb.analyses.insert_one(analysis)
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def extract_key_topics(doc) -> List[str]:
    """
    Extract key topics from the document using noun chunks and frequency
    """
    # Simple implementation - can be enhanced with more sophisticated NLP
    noun_chunks = [chunk.text for chunk in doc.noun_chunks]
    return list(set(noun_chunks))[:10]  # Return top 10 unique topics

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4001)
