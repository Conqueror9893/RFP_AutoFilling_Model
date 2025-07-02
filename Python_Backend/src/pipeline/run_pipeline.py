from ..utils.config import AutoTokenizer, AutoModelForSequenceClassification, MODEL_SAVE_DIR, MODEL_NAME
from ..retriever.preprocess import classify_questions_and_save
from ..llm.response_generator import generate_response, qa_pairs, label_system_messages
from ..llm.verifier import verify_answer

import pandas as pd


def classify_generate_and_verify(csv_path):
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_SAVE_DIR)

    # Classify questions and save the labeled CSV
    classify_questions_and_save(model, tokenizer, csv_path)

    # Load the labeled CSV and generate responses for the first 10 questions
    df = pd.read_csv(csv_path.replace('.csv', '_labeled.csv'))
    responses = []
    verifications = []

    # Use the pre-loaded qa_pairs dictionary to check for pre-existing answers
    for _, row in df.head(175).iterrows():
        query = row['utterance']
        label = row['label']

        # Generate the response using the generate_response function
        response = generate_response(query, qa_pairs,None, csv_path)

        # Perform verification unless the answer is directly from the QA pairs
        if query in qa_pairs:
            verification_result = "not_verified"
        else:
            verification_result = verify_answer(query, response, label_system_messages.get(label, ""), from_csv=False)

        # Append the response and verification result
        responses.append(response)
        verifications.append(verification_result)

    # Add responses and verification results to the dataframe
    df['response'] = responses
    df['verification_result'] = verifications

    # Save the output to a new CSV
    output_csv_path = csv_path.replace('.csv', '_with_responses_and_verifications.csv')
    df.to_csv(output_csv_path, index=False)
    print(f"Responses and verifications saved to {output_csv_path}")