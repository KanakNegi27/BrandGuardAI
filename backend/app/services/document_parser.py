import os
import io
import re
import zipfile
import xml.etree.ElementTree as ET
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

def allowed_file(filename: str, allowed_extensions: set) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

def extract_text_from_file(file_storage) -> Tuple[bool, str]:
    """
    Safely extract plain text from uploaded file stream (txt, docx, pdf).
    Returns (success: bool, content_or_error: str).
    """
    filename = file_storage.filename or "unknown"
    ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else ''

    try:
        content_bytes = file_storage.read()

        if ext == 'txt':
            try:
                text = content_bytes.decode('utf-8')
            except UnicodeDecodeError:
                text = content_bytes.decode('latin-1', errors='ignore')
            return True, text.strip()

        elif ext == 'docx':
            # DOCX is a zip archive containing word/document.xml
            with zipfile.ZipFile(io.BytesIO(content_bytes)) as docx_zip:
                xml_content = docx_zip.read('word/document.xml')
                tree = ET.fromstring(xml_content)
                # Extract all text elements with tag {http://schemas.openxmlformats.org/wordprocessingml/2006/main}t
                namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
                paragraphs = []
                for p in tree.findall('.//w:p', namespaces):
                    texts = [node.text for node in p.findall('.//w:t', namespaces) if node.text]
                    if texts:
                        paragraphs.append(''.join(texts))
                return True, '\n\n'.join(paragraphs)

        elif ext == 'pdf':
            # Basic text-stream extraction from unencrypted PDF
            try:
                raw_text = content_bytes.decode('latin-1', errors='ignore')
                # Find text inside ( ... ) Tj and [ (...) ... ] TJ blocks
                text_chunks = []
                tj_matches = re.findall(r'\((.*?)\)\s*Tj', raw_text)
                if tj_matches:
                    text_chunks.extend(tj_matches)
                else:
                    # Generic string extraction
                    streams = re.findall(r'BT\s*(.*?)\s*ET', raw_text, re.DOTALL)
                    for stream in streams:
                        words = re.findall(r'\((.*?)\)', stream)
                        if words:
                            text_chunks.append(' '.join(words))

                if text_chunks:
                    extracted = ' '.join(text_chunks)
                    return True, extracted.strip()
                else:
                    return False, "Could not extract plain text from PDF. Please paste the document content directly."
            except Exception as pdf_err:
                return False, f"PDF extraction error: {str(pdf_err)}. Please paste text directly."

        else:
            return False, f"Unsupported file extension: .{ext}. Supported formats are: .txt, .docx, .pdf"

    except Exception as e:
        logger.error(f"Error parsing uploaded document {filename}: {e}")
        return False, f"Failed to extract document contents: {str(e)}"
