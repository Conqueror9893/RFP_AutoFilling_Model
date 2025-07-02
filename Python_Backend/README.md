# Prefilling RFPs: Chatbot

This project is designed to streamline the **Request for Proposal (RFP)** process by leveraging advanced machine learning techniques, including **intent classification**, **retrieval-augmented generation (RAG)**, and **large language models (LLMs)**. The goal is to **automatically prefill responses** for RFPs based on historical data, customize the responses based on the question's category, and reference various supporting documents to ensure accuracy and relevance.

---

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

## **Project Structure**

```plaintext
ML_Project/
├── data/                        # Dataset folder
├── notebooks/                   # Prototyping and exploration
├── src/                         # Source code
│   ├── intent_classification/   # Intent classification module
│   ├── retriever/               # RAG retrieval system
│   ├── llm/                     # LLM interaction module
│   ├── api/                     # REST API for integration
│   ├── pipeline/                # Pipeline orchestration
│   └── utils/                   # Utility scripts
├── tests/                       # Unit and integration tests
├── configs/                     # Configuration files
├── artifacts/                   # Generated artifacts
├── postman/                     # Postman collections for API testing
├── scripts/                     # Standalone scripts
├── requirements.txt             # Python dependencies
├── README.md                    # Project documentation
└── setup.py                     # Python package setup script
```

---

## **Technologies Used**

### **1. Machine Learning**
- **Open Source Models**: Utilize models like Gemma, Llama, and other open-source LLMs for response generation and verification.
- **Intent Classification**: Identify the purpose of each query using models like `scikit-learn` or `transformers`.
- **RAG (Retrieval-Augmented Generation)**: Retrieve and generate responses using tools like FAISS and Hugging Face.

### **2. Large Language Models (LLMs)**
- **OpenAI GPT Models**: Generate context-aware responses and verify them for correctness.
- **Custom LLM Integration**: Optionally fine-tune domain-specific models.

### **3. REST API**
- **FastAPI**: Provide endpoints for querying the pipeline and integrating with external tools.

### **4. Indexed Database**
- **FAISS**: Efficient similarity search for document retrieval.
- **ElasticSearch**: Optional for large-scale indexing and querying.

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
  git clone http://192.168.2.6:8009/ixdlabs/rfp.git
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
  python src/pipeline/run_pipeline.py --query "How can we meet the SLA requirements?"
  ```

### **3. API Usage**
- Start the REST API:
  ```bash
  uvicorn src.api.main:app --reload
  ```
- Use Postman to interact with the API. Import the collection from `postman/api_collection.json`.

---

## **Future Enhancements**

1. **Active Learning**: Incorporate user feedback to improve intent classification and response generation.
2. **Fine-Tuned LLMs**: Train domain-specific models for better accuracy.
3. **Interactive UI**: Develop a front-end interface for non-technical users to interact with the pipeline.
4. **Multilingual Support**: Handle RFPs in multiple languages.

---

## **Contributing**
We welcome contributions! Please fork the repository and submit a pull request for any enhancements or bug fixes.

Linked to JIRA EPIC PSA-18

---

## **License**
This project is licensed under the i-exceed proprietary License. 
