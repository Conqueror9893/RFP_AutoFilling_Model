# Intent Classification Training Script
import os
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
from torch.utils.data import Dataset
import pandas as pd
import torch
from src.utils.config import MODEL_NAME, MODEL_SAVE_DIR, SESSION_STORAGE_DIR, TRAINING_EXCEL_PATH, TESTING_EXCEL_PATH, INTENT_TO_LABEL, LABEL_TO_INTENT


class CustomDataset(Dataset):
    def __init__(self, encodings, labels):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx):
        item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx])  # Ensure labels are integers
        return item

    def __len__(self):
        return len(self.labels)


def load_and_preprocess_training_data():
    """
    Load and preprocess the pre-split training and test datasets.
    """
    # Load pre-split training and test datasets from Excel files
    train_df = pd.read_excel(TRAINING_EXCEL_PATH)
    test_df = pd.read_excel(TESTING_EXCEL_PATH)

    # Verify required columns
    for df, file_name in [(train_df, "Train Dataset"), (test_df, "Test Dataset")]:
        if "question" not in df.columns or "label" not in df.columns:
            raise ValueError(f"{file_name} must contain 'question' and 'label' columns.")

    # Map labels to integers
    train_df["label"] = train_df["label"].map(INTENT_TO_LABEL)
    test_df["label"] = test_df["label"].map(INTENT_TO_LABEL)

    # Identify unmapped labels in training data
    if train_df["label"].isnull().any():
        unmapped_train = train_df[train_df["label"].isnull()][["question", "label"]]
        print("\n❌ Unmapped training labels:")
        print(unmapped_train.to_string(index=False))
        raise ValueError("Some training labels could not be mapped to integers. Fix them in the Excel file.")

    # Identify unmapped labels in test data
    if test_df["label"].isnull().any():
        unmapped_test = test_df[test_df["label"].isnull()][["question", "label"]]
        print("\n❌ Unmapped testing labels:")
        print(unmapped_test.to_string(index=False))
        raise ValueError("Some testing labels could not be mapped to integers. Fix them in the Excel file.")



    # Tokenize the data
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    def preprocess_function(texts):
        return tokenizer(list(texts), truncation=True, padding="max_length", max_length=128)
    
    # print(train_df[train_df["question"].isnull() | (train_df["question"].map(lambda x: not isinstance(x, str)))])
    # print(test_df[test_df["question"].isnull() | (test_df["question"].map(lambda x: not isinstance(x, str)))])

    train_encodings = preprocess_function(train_df["question"])
    test_encodings = preprocess_function(test_df["question"])

    # Convert to PyTorch datasets
    train_labels = train_df["label"].astype(int).tolist()
    test_labels = test_df["label"].astype(int).tolist()

    train_dataset = CustomDataset(train_encodings, train_labels)
    test_dataset = CustomDataset(test_encodings, test_labels)


    return train_dataset, test_dataset


def train_or_load_model(train_dataset, test_dataset):
    """
    Train the model if not already stored; otherwise, load it from session storage.
    """
    required_files = ["config.json", "tokenizer_config.json"]
    model_files_exist = all(os.path.exists(os.path.join(MODEL_SAVE_DIR, f)) for f in required_files)

    if model_files_exist:
        # Load the model from session storage if all required files exist
        print("Loading pre-trained model from session storage...")
        model = AutoModelForSequenceClassification.from_pretrained(MODEL_SAVE_DIR)
    else:
        # Train the model from scratch if it doesn't exist
        print("Training model as no pre-trained model found...")
        model = AutoModelForSequenceClassification.from_pretrained(
            MODEL_NAME, num_labels=len(LABEL_TO_INTENT)  # Ensure num_labels matches the number of classes
        )

        training_args = TrainingArguments(
            output_dir=SESSION_STORAGE_DIR,
            eval_strategy="epoch",
            save_strategy="epoch",
            learning_rate=2e-5,
            per_device_train_batch_size=16,
            per_device_eval_batch_size=16,
            num_train_epochs=3,
            weight_decay=0.01,
            logging_dir=f"{SESSION_STORAGE_DIR}/logs",
            load_best_model_at_end=True,
            report_to="none",
        )

        # Initialize the Trainer
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=train_dataset,
            eval_dataset=test_dataset,
            tokenizer=AutoTokenizer.from_pretrained(MODEL_NAME),
        )
        
        trainer.train()

        print("Saving the trained model...")
        try:
            model.save_pretrained(MODEL_SAVE_DIR)
            print(f"Model saved at {MODEL_SAVE_DIR}")
        except Exception as e:
            print(f"Error occurred while saving the model: {e}")

    return model


def train_model():
    train_dataset, test_dataset = load_and_preprocess_training_data()
    model = train_or_load_model(train_dataset, test_dataset)
    return model


if __name__ == "__main__":
    model = train_model()
    print("Model training completed.")
