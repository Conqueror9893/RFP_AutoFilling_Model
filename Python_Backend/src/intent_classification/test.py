# Intent Classification Prediction Script 
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from ..utils.config import MODEL_SAVE_DIR, LABEL_TO_INTENT
LABEL_TO_INTENT = {int(k): v for k, v in LABEL_TO_INTENT.items()}
def test_model(query):
    # Load tokenizer and model
    tokenizer = AutoTokenizer.from_pretrained(MODEL_SAVE_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_SAVE_DIR)

    # Preprocess query
    inputs = tokenizer(query, return_tensors="pt", truncation=True, padding="max_length", max_length=128)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    inputs = {key: val.to(device) for key, val in inputs.items()}

    # Perform inference
    model.eval()
    model.to(device)
    with torch.no_grad():
        outputs = model(**inputs)
        logits = outputs.logits
        predicted_class = torch.argmax(logits, dim=1).item()

    # Map numeric class ID to the corresponding label
    predicted_label = LABEL_TO_INTENT.get(int(predicted_class), "Unknown Label")

    return predicted_label


