from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List
import os
import spacy
from transformers import pipeline
from src.utils.document_processor import process_document
from src.models.analysis import DeckAnalysis

app = FastAPI(title="Deck Analysis Service")

# Initialize NLP models
nlp = None
summarizer = None

def initialize_models():
    global nlp, summarizer
    try:
        nlp = spacy.load("en_core_web_sm")
        print("Successfully loaded spaCy model")
    except Exception as e:
        print(f"Error loading spaCy model: {str(e)}")
        raise

    try:
        summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
        print("Successfully loaded BART model")
    except Exception as e:
        print(f"Warning: Could not load BART model: {str(e)}")
        summarizer = None

# Initialize models
initialize_models()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
@app.on_event("startup")
async def startup_db_client():
    app.mongodb_client = AsyncIOMotorClient(os.getenv("MONGODB_URI", "mongodb://admin:password@mongodb:27017"))
    app.mongodb = app.mongodb_client.grant_matcher

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

@app.post("/analyze")
async def analyze_deck(file: UploadFile = File(...)):
    """
    Analyze uploaded pitch deck and extract key information
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")
        
    if not file.filename.lower().endswith(('.pdf', '.ppt', '.pptx')):
        raise HTTPException(status_code=400, detail="File type not supported. Please upload a PDF or PowerPoint file.")
    
    try:
        # Process document and extract text
        text = await process_document(file)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from the document")
            
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
        
        # Create analysis result
        analysis = {
            "entities": entities,
            "key_topics": [chunk.text for chunk in doc.noun_chunks][:10],
            "document_type": file.content_type,
            "filename": file.filename
        }
        
        # Generate summary if BART model is available
        if summarizer:
            try:
                summary = summarizer(text[:1024], max_length=130, min_length=30, do_sample=False)
                analysis["summary"] = summary[0]["summary_text"] if summary else ""
            except Exception as e:
                print(f"Warning: Could not generate summary: {str(e)}")
                analysis["summary"] = ""
        else:
            analysis["summary"] = ""
        
        # Store analysis in MongoDB
        await app.mongodb.analyses.insert_one(analysis)
        
        return analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing document: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 4003))
    uvicorn.run(app, host="0.0.0.0", port=port)
