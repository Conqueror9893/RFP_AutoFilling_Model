import pandas as pd
from sklearn.model_selection import train_test_split
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("data_processing.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("data_preprocessing_logger")

try:
    file_path = ".\local_folder\Labelled_Data.xlsx" 
    logger.info("Loading dataset from Excel file.")
    df = pd.read_excel(file_path)
    logger.info("Checking for missing values in the dataset.")
    if df.isnull().any().any():
        missing_values = df[df.isnull().any(axis=1)]
        logger.error(f"Rows with Missing Values:\n{missing_values}")
        raise ValueError("Dataset contains missing values. Please handle them before splitting.")

    required_columns = {"question", "answer", "label"}
    logger.info("Ensuring required columns exist in the dataset.")
    if not required_columns.issubset(df.columns):
        missing_columns = required_columns - set(df.columns)
        logger.error(f"Missing required columns: {missing_columns}")
        raise ValueError("The dataset must contain 'question', 'answer', and 'label' columns.")

    logger.info("Inspecting class distribution in the dataset.")
    label_counts = df["label"].value_counts()
    logger.debug(f"Class Distribution:\n{label_counts}")

    problematic_labels = label_counts[label_counts < 2]
    if not problematic_labels.empty:
        logger.error(f"Problematic Labels (Less than 2 instances):\n{problematic_labels}")
        raise ValueError("Some labels have fewer than 2 instances, which prevents stratified splitting.")

    logger.info("Splitting features and labels.")
    X = df[["question", "answer"]] 
    y = df["label"] 

    logger.info("Performing stratified train-test split.")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    train_data = pd.concat([X_train, y_train], axis=1)
    test_data = pd.concat([X_test, y_test], axis=1)

    logger.info("Saving training and test data to Excel files.")
    train_data.to_excel("train_data.xlsx", index=False, engine="openpyxl")
    test_data.to_excel("test_data.xlsx", index=False, engine="openpyxl")

    logger.debug(f"Training Data Sample:\n{train_data.head()}\n")
    logger.debug(f"Test Data Sample:\n{test_data.head()}\n")

except FileNotFoundError as fnf_error:
    logger.error(f"File not found: {fnf_error}")
except ValueError as ve:
    logger.error(f"Value error: {ve}")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
