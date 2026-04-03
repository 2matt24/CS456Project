import PyPDF2
import io

def extract_text_from_pdf(file_stream):
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(file_stream)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return None

def extract_text_from_docx(file_stream):
    """Extract text from .docx file"""
    try:
        import docx
        document = docx.Document(file_stream)
        paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except Exception as e:
        print(f"DOCX extraction error: {e}")
        return None

def extract_text_from_file(file, file_type):
    """Extract text based on file type"""
    if file_type == 'pdf':
        return extract_text_from_pdf(file)
    elif file_type == 'docx':
        return extract_text_from_docx(file)
    elif file_type in ['txt', 'md']:
        return file.read().decode('utf-8')
    else:
        return None