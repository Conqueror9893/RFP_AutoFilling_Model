# DumbSyed: RFP Auto-Filling Assistant

## Overview

DumbSyed is an AI-powered assistant designed to automate the tedious task of filling out RFPs (Request for Proposals). This project is designed to streamline the **Request for Proposal (RFP)** process by leveraging advanced machine learning techniques, including **intent classification**, **retrieval-augmented generation (RAG)**, and **large language models (LLMs)**. The goal is to **automatically prefill responses** for RFPs based on historical data, customize the responses based on the question's category, and reference various supporting documents to ensure accuracy and relevance.

**Current version**: V02 I01\
## **Key Features**

### **1. Intelligent Prefilling**
- **Historical RFP Matching**: Analyze past RFPs to identify patterns and reuse relevant responses.
- **Category-Based Customization**: Dynamically tailor responses to different question types (e.g., technical, financial, legal).

### **2. Document Referencing**
- **Indexed Database Search**: Retrieve relevant information from an indexed database of supporting documents.
- **Contextual Response Generation**: Combine retrieved data with user queries to generate precise and well-informed answers.

### **3. Verification Pipeline**
- **Response Validation**: Verify the accuracy of generated responses using a secondary LLM, ensuring they align with the retrieved context.
- **Feedback Loop**: Flag unverifiable responses for manual review or further refinement.

---


## **How It Works**

### **Step 1: Intent Classification**
- Classify the user query into predefined intents (e.g., "Technical Details" or "Pricing Inquiry").
- Generate a **system message** to guide the response pipeline.

### **Step 2: Retrieval-Augmented Generation (RAG)**
- Query an **indexed database** to fetch similar RFP responses and relevant supporting documents.
- Use the retrieved results as context for generating a customized response via a primary LLM.

### **Step 3: LLM-Based Response Verification**
- Pass the generated response and retrieved context to a secondary LLM that acts as a verifier.
- If the response is validated, it is finalized and presented to the user; otherwise, it is flagged for review.

---

## Project Structure

```
RFP_Cruncher/
├── Python_Backend/          # Python FastAPI app
│   ├── src/
│   ├── local_folder/pdf_files/  # PDF uploads
│   └── ...
├── Frontend/ # React-based UI
├── Java_Backend
├── requirements.txt  # Python dependencies
└── .env              # API keys, config paths
```

## ✅ Prerequisites

- Python 3.10+
- Node.js (for frontend)
- pip (or pipenv/venv)
- [Google News pretrained word2vec model (optional)](https://drive.google.com/file/d/0B7XkCwpI5KDYNlNUTTlSS21pQmM/view)


---

## **Use Cases**

- **Automating RFP Responses**: Prefill RFPs to save time and reduce manual effort.
- **Customized Responses**: Tailor answers to specific question types and categories.
- **Enhanced Accuracy**: Reference multiple documents to ensure well-informed responses.
- **Scalability**: Handle large datasets and multiple RFPs efficiently.

---


## **Getting Started**

### **1. Installation**
- Clone the repository:
  ```bash
  git clone https://github.com/Conqueror9893/RFP_AutoFilling_Model
  ```
- Install dependencies:
  ```bash
  pip install -r requirements.txt
  ```
To install for different cuda:

 ```bash
 pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118  (Change the cuda version)
 ```
If venv error, use the command

rm ./rfp_env

Then, create a new environment:

python -m venv rfp_env

### **2. Running the Pipeline**
- Execute the pipeline locally:
  ```bash
  ./run_all.sh
  ```

### **3. API Usage**
- Start the REST API:
  ```bash
  uvicorn src.api.main:app --reload
  ```
- Use Postman to interact with the API. Import the collection from `postman/api_collection.json`.

---
## 📁 PDF & Excel Upload Guidelines

### RFP Training File Format

- Must be in `.xlsx` format.
- Required columns: `Questions`, `Answer` (case-sensitive, no trailing spaces).
- No blank rows or misaligned cells.

### For Prediction Excel Uploads

- Required: `query` column.
- Optionally include a blank `Answer` column to be auto-filled.

### PDF Files

- Drop files into `local_folder/pdf_files`
- Supports scanned PDFs with selectable text.

## ⚙️ Tech Stack

- **Language**: Python 3.10+
- **Frameworks**: FastAPI, Flask, React, Java
- **ML/NLP**: sentence-transformers, gensim, scikit-learn, LLM called gemma2:2b or gemma3:4b
- **Vector Store**: ChromaDB
- **Frontend**: React

## 🧪 New Improvements in V01 I03

- Parallelized PDF processing with `multiprocessing`.
- Memory-efficient chunking and error handling.
- Integrated logging and telemetry for debugging.
- React frontend created
- Introduced enriching of responses and single question answer flow

## ⚠️ Disclaimer

DumbSyed is under active development and not recommended for production or enterprise environments. Contributions, ideas, or bug reports are welcome.

---

Happy crunching RFPs ✨

