import os
import pickle
# import zipfile
import fitz
from ..utils.logger import logger
from ..utils.config import sentence_model, collection, embeddings_file_path, embeddings

def extract_text_from_pdf(pdf_path):
    try:
        logger.info(f"Extracting text from PDF: {pdf_path}")
        document = fitz.open(pdf_path)
        text = ""
        for page_num in range(len(document)):
            page = document.load_page(page_num)
            text += page.get_text("text")
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF {pdf_path}: {e}")
        raise

def split_text(text, chunk_size=300):
    paragraphs = text.split("\n")
    chunks = []
    current_chunk = ""
    for paragraph in paragraphs:
        if len(current_chunk) + len(paragraph) < chunk_size:
            current_chunk += paragraph + "\n"
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = paragraph + "\n"
    if current_chunk:
        chunks.append(current_chunk)
    return chunks

def process_pdfs_and_store_embeddings(pdf_folder):
    try:
        if not os.path.exists(pdf_folder):
            os.makedirs(pdf_folder)

        logger.info("Processing PDFs and generating embeddings...")
        for i, pdf_file in enumerate(os.listdir(pdf_folder)):
            if pdf_file.endswith('.pdf'):
                pdf_path = os.path.join(pdf_folder, pdf_file)
                pdf_text = extract_text_from_pdf(pdf_path)
                text_chunks = split_text(pdf_text)

                for j, chunk in enumerate(text_chunks):
                    embedding = sentence_model.encode(chunk)
                    collection.add(
                        documents=[chunk],
                        metadatas=[{"filename": pdf_file, "chunk_index": j}],
                        embeddings=[embedding],
                        ids=[f"{i}_{j}"]
                    )

        # Save embeddings to file
        with open(embeddings_file_path, "wb") as f:
            pickle.dump(embeddings, f)
        logger.info("Embeddings successfully generated and stored.")
    except Exception as e:
        logger.error(f"Error during embedding generation: {e}")
        raise
