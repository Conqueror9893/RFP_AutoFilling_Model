# Config Utility 
import os
from dotenv import load_dotenv
import pandas as pd
import re
import chromadb
import pickle
import json
from sentence_transformers import SentenceTransformer

load_dotenv()
os.environ["PYTHONIOENCODING"] = "utf-8"
MODEL_NAME = os.getenv("MODEL_NAME")
SESSION_STORAGE_DIR = os.getenv("SESSION_STORAGE_DIR")
MODEL_SAVE_DIR = os.getenv("MODEL_SAVE_DIR")
TRAINING_EXCEL_PATH = os.getenv("TRAINING_EXCEL_PATH")
TESTING_EXCEL_PATH = os.getenv("TESTING_EXCEL_PATH")
EXCEL_ANSWERED_QUESTIONS_PATH = os.getenv("EXCEL_ANSWERED_QUESTIONS_PATH")
HF_TOKEN = os.getenv("HF_TOKEN")
LABEL_TO_INTENT = json.loads(os.getenv("LABEL_TO_INTENT", "{}"))

if not isinstance(LABEL_TO_INTENT, dict):
    raise ValueError("LABEL_TO_INTENT must be a dictionary.")

INTENT_TO_LABEL = {v: k for k, v in LABEL_TO_INTENT.items()}


global_system_message = """
You are a professional assistant representing i-exceed technology solutions Pvt Ltd, responding to a bank's query.
The response should directly explain the features and capabilities of our platform in a structured, professional tone.
The answer must address the query as if it is coming directly from a product specialist.
All responses should follow this structure:
1. Highlight specific platform features or technical capabilities that address the query.
2. Provide detailed insights into how the feature is implemented (e.g., frameworks, technologies used, compatibility).
Limit the response to 75 words, avoid repeating information, and ensure clarity and professionalism.
Make the response comprehensive by addressing all the components asked in the query. 
Tailor the response to the query asked. If the context does not explicitly confirm a feature or functionality, avoid assuming or mentioning it in the response.
"""

local_storage_path = './local_folder'
if not os.path.exists(local_storage_path):
    os.makedirs(local_storage_path)

persist_directory = os.path.join(local_storage_path, 'chroma_data')
embeddings_file_path = os.path.join(local_storage_path, "embeddings.pkl")
sentence_model_path = os.path.join(local_storage_path, "sentence_model.pkl")
pdf_folder = './local_folder/pdf_files'
pdf_files = os.listdir(str(pdf_folder))


client = chromadb.PersistentClient(path=persist_directory)
collection_name = "document_embeddings"
embedding_function = None

if collection_name in client.list_collections():
    collection = client.get_collection(collection_name)
else:
    collection = client.get_or_create_collection(
        name=collection_name,
        embedding_function=embedding_function
    )
    print(f"Collection '{collection_name}' created.")

if os.path.exists(sentence_model_path):
    with open(sentence_model_path, "rb") as f:
        sentence_model = pickle.load(f)
else:
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    sentence_model = SentenceTransformer(model_name)
    with open(sentence_model_path, "wb") as f:
        pickle.dump(sentence_model, f)

if os.path.exists(embeddings_file_path):
    print("Loading embeddings from local storage...")
    with open(embeddings_file_path, "rb") as f:
        embeddings = pickle.load(f)
else:
    print("No existing embeddings found. Initializing new list...")
    embeddings = []

def normalize_text(text):
    if isinstance(text, str):
        text = re.sub(r'[^\w\s]', '', text)
        text = text.lower().strip()
    else:
        text = str(text)
    return text

def load_answers_from_excel(excel_path):
    if os.path.exists(excel_path):
        df = pd.read_excel(excel_path)
        if 'question' in df.columns and 'answer' in df.columns:
            return {normalize_text(q): a for q, a in zip(df['question'], df['answer'])}
        else:
            raise ValueError("The Excel file must contain 'question' and 'answer' columns.")
    else:
        return {}
    

def save_answers_to_excel(qa_pairs, excel_path):
    """
    Save the given QA pairs to an Excel file.
    """
    data = [{"question": query, "answer": answer} for query, answer in qa_pairs.items()]
    df = pd.DataFrame(data)
    df.to_excel(excel_path, index=False, sheet_name="Answers", engine="openpyxl")

# Updated list of labels for the dropdown (no descriptions after colon)
# LABEL_OPTIONS = [
#     "Functional Retail Both Authentication & Security (Authentication & Security)",
#     "Functional Retail Both Dashboard (Dashboard)",
#     "Functional Retail Both Accounts (Accounts)",
#     "Functional Retail Both Transfers (Transfers)",
#     "Functional Retail Both Service Requests (Service Requests)",
#     "Functional Retail Both Cards (Cards)",
#     "Functional Retail Both Bill Payments (Bill Payments)",
#     "Functional Retail Both Personal Finance Management (Finance)",
#     "Functional Retail Both Family Banking (Family Banking)",
#     "Functional Retail Both Loans (Loans)",
#     "Functional Retail Both Settings (Settings)",
#     "Functional Retail Both Administration (Administration)",
#     "Functional Retail Both Onboarding (Onboarding)",
#     "Technical Retail Both General (General)",
#     "Technical Retail Both UI/UX (UI/UX)",
#     "Technical Retail Both Architecture (Architecture)",
#     "Technical Retail Both Integration (Integration)",
#     "Technical Retail Both Cloud Readiness (Cloud Readiness)",
#     "Technical Retail Both Performance (Performance)",
#     "Technical Retail Both Security (Security)"
# ]
 
LABEL_OPTIONS = [
    "Technical",
    "Functional"
]

EXAMPLES = {
    "Technical": """lorem lupsum
    """,
    "Functional": """lorem lupsum
"""
}
# # Example Mapping for the Categories (updated with no descriptions)
# EXAMPLES = {
#     "Functional Retail Both Authentication & Security (Authentication & Security)": """
#     **Example**: If your question is about security, choose the category 'Functional Retail Both Authentication & Security'.
#     You could ask questions like:
#     - "What are the security protocols for user authentication?"
#     - "How do I transfer funds securely between accounts?"
#     - "What are the best practices for dashboard design?"
#     """,
#     "Functional Retail Both Dashboard (Dashboard)": """
#     **Example**: If your question is about Dashboard, choose the category 'Functional Retail Both Dashboard'.
#     You could ask questions like:
#     - "Do you support crystal news in the dashboard?"
#     - "Favorites, area, for quick access to commonly used functions."
#     - "In-app search (text & voice-enabled)"
#     """,
#     "Functional Retail Both Accounts (Accounts)": """
#     **Example**: If your question is about Accounts, choose the category 'Functional Retail Both Accounts'.
#     You could ask questions like:
#     - "How does the system categorize accounts (e.g., current, deposit, loan accounts)?"
#     - "Can users easily view and manage all account types in one interface?"
#     - "What information is provided about each account (e.g., balance, transaction history)?"
#     """,
#     "Functional Retail Both Transfers (Transfers)": """
#     **Example**: If your question is about Transfers, choose the category 'Functional Retail Both Transfers'.
#     You could ask questions like:
#     - "Transfer money between own accounts."
#     - "Money Transfers between Internal account transfers (B2B, P2P, P2B, B2P)."
#     - "Send and receive remittances."
#     """,
#     "Functional Retail Both Service Requests (Service Requests)": """
#     **Example**: If your question is about Service Requests, choose the category 'Functional Retail Both Service Requests'.
#     You could ask questions like:
#     - "A meeting request is sent to users’ calendar."
#     - "Send message via Digital channels. This can also be supported via AI chat."
#     - "Administration of user messages can be done."
#     """,
#       "Functional Retail Both Cards (Cards)": """
#        If your question is about Cards, choose the category 'Functional Retail Both Cards'.
#           For example, you could ask questions like:
#         - "Does the solution allow users to view the PIN code for their debit and credit cards?"
#     - "Can users change their debit or credit card PIN code in the solution?"
#      "Does the solution support users requesting a new debit card in case it is lost?"
 
#     """,
#      "Functional Retail Both Bill Payments (Bill Payments)": """
#       If your question is about Bill Payments, choose the category 'Functional Retail Both Bill Payments'.
#           For example, you could ask questions like:
#         - "User is able to use credit/debit card for Google pay payments."
#     - "User is able to set debit/credit card in mobile app as a payment method"
#     - "User is able to use credit/debit card for Apple pay payments."
#     """,
#     "Functional Retail Both Personal Finance Management (Finance)": """
#       If your question is about Finance, choose the category 'Functional Retail Both Personal Finance Management'.
#           For example, you could ask questions like:
#         - "Risk assessment questionnaire is in place to perform risk assessment"
#     - "Calendar of his banker is available to the user, enabling them to choose a relevant time, when the banker is available."
#     - "A meeting request is sent to users’ calendar."  
 
#     """,
#     "Functional Retail Both Family Banking (Family Banking)": """
#       If your question is about Family Banking, choose the category 'Functional Retail Both Family Banking'.
#           For example, you could ask questions like:
#         - "Joint accounts for parents & guardians"
#     - "Sub-accounts for children & teens"
#     - "Monitor children's account activity, set spending limits, and receive real-time alerts for specific transactions"
 
#     """,
#     "Functional Retail Both Loans (Loans)": """
#       If your question is about Loans, choose the category 'Functional Retail Both Loans'.
#           For example, you could ask questions like:
#         - "Finances(Does the solution allow customers to manage and view their finances, including loans? )"
#     - "Does the solution allow users to view details of their existing finances?"
#     - "Can users inquire about their credit limits at the account level?"
 
#     """,
#     "Functional Retail Both Settings (Settings)": """
#         If your question is about Settings, choose the category 'Functional Retail Both Settings'.
#           For example, you could ask questions like:
#         - "Notification configuration"
#     - "Do you  support Change username & password"
#     - "Manage device details - add, remove devices"
 
#     """,
#     "Functional Retail Both Administration (Administration)": """
#         If your question is about Administration, choose the category 'Functional Retail Both Administration'.
#           For example, you could ask questions like:
#         - "Configure access levels & permissions for each user type"
#     - "Block, activate, disable & unlock user and add notes on the status"
#     - "Change relation ship based limits"
 
#     """,
#     "Functional Retail Both Onboarding (Onboarding)": """
#         If your question is about Onboarding, choose the category 'Functional Retail Both Onboarding'.
#           For example, you could ask questions like:
#         - "Upgrades are backwards compatible for at least one version"
#     - "Regarding mobile OS we adhere to the OS vendor guidelines and  OWASP guidelines"
#     - "List any planned enhancements with planned release dates."
 
#     """,
#     "Technical Retail Both General (General)": """
#         If your question is about General, choose the category 'Functional Retail Both General'.
#           For example, you could ask questions like:
#         - "What are the general technical requirements for our system?"
#         - "How do I assess system performance?"
#     """,
#      "Technical Retail Both UI/UX (UI/UX)": """
#        If your question is about UI/UX, choose the category 'Functional Retail Both UI/UX'.
#           For example, you could ask questions like:
#         - "Providing the customer an option to choose a dark theme"
#     - "Creating a menu to add different or favorite links to be accessed easily"
#     - "Can you having a Customize design"
 
#     """,
#    "Technical Retail Both Architecture (Architecture)": """
#     If your question is about Architecture, choose the category 'Technical Retail Both Architecture'.
#           For example, you could ask questions like:
#         **Example Questions**:
#         - "Upgrades are backwards compatible for at least one version"
#     - "Please refer to platform roadmap provided"
#     - "Regulatory requirements are included in our regular upgrades"
 
#     """,
#    "Technical Retail Both Integration (Integration)": """
#        If your question is about Integration, choose the category 'Technical Retail Both Integration'.
#           For example, you could ask questions like:
#         - "Does the interface involve Event based interaction?"
#     - "Does the system need to transform data structure?"
#     - "How does the interface assure transaction success/failure?"
 
#     """,
#    "Technical Retail Both Cloud Readiness (Cloud Readiness)": """
#        If your question is about Cloud, choose the category 'Technical Retail Both Cloud Readiness'.
#           For example, you could ask questions like:
#         - "Cloud at customer deployment: It is identical to Platform as a service, but located in bank’s own data center."
#     - "Does the solution support data encryption, communication encryption, and compliance with EU privacy regulations (e.g., GDPR)?"
#     - "Can the bank access data via APIs in the proposed solution?"
 
#     """,
#   "Technical Retail Both Performance (Performance)": """
#         If your question is about Performance, choose the category 'Technical Retail Both Performance'.
#           For example, you could ask questions like:
#         - "Is benchmark reports available on the version proposed to the Bank?"
#         - "NFT – Load testing, stress testing performed in existing implementations"
#         - "What's the availability scale of your solution?"
 
#     """,
#     "Technical Retail Both Security (Security)": """
#        If your question is about Security, choose the category 'Technical Retail Both Security'.
#           For example, you could ask questions like:
#         - "System supports role-based access control (RBAC)"
#         - "System implements multi-factor authentication (MFA)"
#         - "System complies with PCI DSS standards"
 
#     """
#     # Add examples for other new labels here
# }