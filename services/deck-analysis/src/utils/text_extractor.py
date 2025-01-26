import PyPDF2
from io import BytesIO

async def extract_text(file_bytes: bytes) -> str:
    """Extract text from a PDF file."""
    pdf_file = BytesIO(file_bytes)
    
    try:
        # Create PDF reader object
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        
        # Extract text from all pages
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
            
        return text
    except Exception as e:
        raise Exception(f"Error extracting text from PDF: {str(e)}")
