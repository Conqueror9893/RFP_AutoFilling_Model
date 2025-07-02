import subprocess
import json
from sentence_transformers import SentenceTransformer
from ..utils.config import normalize_text, load_answers_from_excel, EXCEL_ANSWERED_QUESTIONS_PATH, global_system_message
from ..llm.llm_utils import label_system_messages
from ..utils.logger import logger  
import chromadb
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from fuzzywuzzy import process
from .generate_embeddings import process_pdfs_and_store_embeddings
from ..utils.logger import logger

try:
    logger.info("Initializing SentenceTransformer and ChromaDB client.")
    sentence_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    client = chromadb.PersistentClient(path="./local_folder/chroma_data")
    collection = client.get_or_create_collection(name="document_embeddings")
except Exception as e:
    logger.error(f"Error during initialization: {e}")
    raise

# Check if the collection contains data
try:
    logger.info("Checking if the collection contains any data...")
    if collection.count() == 0:
        logger.info("The collection is empty. Generating embeddings...")
        process_pdfs_and_store_embeddings("./local_folder/pdf_files")  # Path to your PDFs
    else:
        logger.info(f"The collection contains {collection.count()} items.")
except Exception as e:
    logger.error(f"Error while checking the collection: {e}")
    raise

# Continue with the rest of the response generation logic...

# Load question-answer pairs into a dictionary
try:
    logger.info("Loading question-answer pairs from Excel.")
    qa_pairs = load_answers_from_excel(EXCEL_ANSWERED_QUESTIONS_PATH)
except Exception as e:
    logger.error(f"Error loading QA pairs: {e}")
    raise

def run_ollama_model(prompt):
    """
    Calls the Ollama model via the `ollama` CLI and returns the response.
    """
    try:
        logger.info("Running Ollama model.")
        result = subprocess.run(
            ["ollama", "run", "gemma2:2b"],
            input=prompt,
            encoding="utf-8",  # ✅ Set UTF-8 encoding
            errors="replace",
            text=True,
            capture_output=True
        )

        if result.returncode != 0:
            logger.error(f"Ollama CLI Error: {result.stderr.strip()}")
            raise Exception(f"Ollama CLI Error: {result.stderr.strip()}")

        output = result.stdout.strip()
        logger.debug(f"Ollama model output: {output}")
        if not output:
            logger.info("Ollama returned empty stdout.")
            return "The model did not return a response."
        return output
    except Exception as e:
        logger.error(f"Error running Ollama model: {e}")
        return "Unable to generate a response."

def lookup_and_match_query(query, qa_pairs):
    try:
        logger.info("Performing query lookup and matching.")
        normalized_query = normalize_text(query)
        existing_queries = [normalize_text(q) for q in qa_pairs.keys()]
        query_embedding = sentence_model.encode([normalized_query])
        existing_embeddings = sentence_model.encode(existing_queries)
        similarities = cosine_similarity(query_embedding, existing_embeddings)[0]
        sorted_indices = np.argsort(similarities)[::-1]
        top_match_index = sorted_indices[0]
        top_match_score = similarities[top_match_index]

        similar_questions = []
        for idx in sorted_indices[:3]:
            similar_questions.append({
                "question": list(qa_pairs.keys())[idx],
                "answer": qa_pairs[list(qa_pairs.keys())[idx]],
                "similarity_score": round(similarities[idx] * 100, 2)
            })

        threshold = 0.7
        if top_match_score >= threshold:
            logger.info("High similarity match found.")
            return existing_queries[top_match_index], qa_pairs[existing_queries[top_match_index]]
        
        fuzzy_match, fuzzy_score = process.extractOne(normalized_query, existing_queries)
        fuzzy_threshold = 90
        if fuzzy_score >= fuzzy_threshold:
            logger.info("Fuzzy match found.")
            return fuzzy_match, qa_pairs[fuzzy_match]

        logger.info("No match found.")
        return None, None
    except Exception as e:
        logger.error(f"Error during query lookup and matching: {e}")
        return None, None
def generate_response(query, qa_pairs, csv_path=None, label=None):
    try:
        logger.info("Generating response for the query.")
        if label:
            logger.debug(f"Assigned Label: {label}")
        existing_query, base_answer = lookup_and_match_query(query, qa_pairs)

        # Step 1: Match found in QA pairs
        if base_answer:
            logger.info("Match found in QA pairs.")
            enrichment_prompt = f"""
            {global_system_message}
            Query: {query}

            Original Answer:
            {base_answer}

            Enriched Answer:
            """

            try:
                enriched_answer = run_ollama_model(enrichment_prompt)
                logger.info("Enrichment successful.")
                return enriched_answer  # Returning enriched answer
            except Exception as e:
                logger.error(f"Error during enrichment: {e}")
                return base_answer  # Return base answer if enrichment fails

        # Step 2: No match in QA pairs, retrieve context from ChromaDB
        logger.info("No match in QA pairs. Retrieving context from ChromaDB.")
        results = collection.query(
            query_embeddings=[sentence_model.encode(query)],
            n_results=5,
            include=['metadatas', 'documents']
        )

        if not results["documents"] or not any(results["documents"]):
            logger.warning("No relevant documents found in the database.")
            return "The retrieved documentation does not provide sufficient details to answer this query."


        # Extract source documents and metadata
        documents = results["documents"][0]
        metadata = results["metadatas"][0]
        context_text = "\n\n---\n\n".join(documents)

        # Log the source chunks to console (not displayed to the user)
        logger.info("Context retrieved from ChromaDB:")
        for doc, meta in zip(documents, metadata):
            logger.info(f"Source Chunk: {doc}")
            logger.info(f"Metadata: {meta}")

        label_message = label_system_messages.get(label, "")
        prompt = f"""
        {global_system_message}

        {label_message}

        Query: {query}

        Context:
        {context_text}

        Based strictly on the above context, provide a professional, accurate response. Do not assume or infer any functionality not explicitly mentioned.
        """

        # Generate the response using the context
        try:
            answer = run_ollama_model(prompt)
            logger.info("Response generation successful.")

            # Validate the response
            if not answer.strip() or "Unable to generate a response" in answer:
                logger.warning("Generated response is invalid or lacks proper context.")
                return "The retrieved documentation does not provide sufficient details to answer this query."

            return answer
        except Exception as e:
            logger.error(f"Error generating response from context: {e}")
            return "The retrieved documentation does not provide sufficient details to answer this query."

    except Exception as e:
        logger.error(f"Error generating response: {e}")
        return "Unable to generate a response."
