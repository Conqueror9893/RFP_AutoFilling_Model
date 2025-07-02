# Data Preprocessing Script 
import pandas as pd
import torch
from ..utils.config import LABEL_TO_INTENT

KEYWORDS = {
    "Functional Retail Both Authentication & Security": ["authentication", "security", "login", "password", "MFA"],
    "Functional Retail Both Dashboard": ["dashboard", "overview", "home"],
    "Functional Retail Both Accounts": ["account", "balance", "statements", "savings", "current"],
    "Functional Retail Both Transfers": ["transfer", "send", "funds", "money"],
    "Functional Retail Both Service Requests": ["request", "service", "support"],
    "Functional Retail Both Cards": ["credit card", "debit card", "card issuance"],
    "Functional Retail Both Bill Payments": ["bill", "payment", "utility"],
    "Functional Retail Both Personal Finance Management": ["budgeting", "savings", "expenditure", "finance"],
    "Functional Retail Both Family Banking": ["family", "linked", "joint"],
    "Functional Retail Both Loans": ["loan", "mortgage", "interest rate"],
    "Functional Retail Both Settings": ["settings", "preferences", "configuration"],
    "Functional Retail Both Administration": ["administration", "admin", "user management"],
    "Functional Retail Both Onboarding": ["onboarding", "register", "signup", "KYC"],
    "Technical Retail Both General": ["general", "system", "requirements"],
    "Technical Retail Both UI/UX": ["interface", "UI", "UX", "design", "accessibility"],
    "Technical Retail Both Architecture": ["architecture", "system design", "layers", "compute", "storage", "datacenter footprint","disaster recovery & backup"],
    "Technical Retail Both Integration": ["integration", "API", "third-party"],
    "Technical Retail Both Cloud Readiness": ["cloud", "deployment", "scalability"],
    "Technical Retail Both Performance": ["performance", "speed", "latency"],
    "Technical Retail Both Security": ["encryption", "data protection", "security", "protocols"],
}

# Function to classify based on keywords (Step 2)
def keyword_based_classification(question):
    """
    Classify a given question based on predefined keywords for each label.
    """
    for label, keywords in KEYWORDS.items():
        if any(keyword.lower() in question.lower() for keyword in keywords):
            return label
    return None

# Modify the classify_questions_and_save function to include keyword classification (Step 3)
def classify_questions_and_save(model, tokenizer, csv_path):
    df = pd.read_csv(csv_path)

    if 'utterance' not in df.columns:
        raise ValueError("The CSV must contain an 'utterance' column.")

    labels = []
    for question in df['utterance']:
        # First, try keyword-based classification
        keyword_label = keyword_based_classification(question)
        if keyword_label:
            labels.append(keyword_label)
            continue

        # If keyword-based classification fails, use the model to classify
        inputs = tokenizer(question, return_tensors="pt", truncation=True, padding="max_length", max_length=128)
        device = "cuda" if torch.cuda.is_available() else "cpu"
        inputs = {key: val.to(device) for key, val in inputs.items()}

        model.eval()
        model.to(device)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits
            predicted_class = torch.argmax(logits, dim=1).item()
            labels.append(LABEL_TO_INTENT[predicted_class])

    df['label'] = labels
    output_csv_path = csv_path.replace('.csv', '_labeled.csv')
    df.to_csv(output_csv_path, index=False)