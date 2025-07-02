# LLM Verifier 
from ..llm.llm_utils import label_system_messages
from ..utils.config import collection, sentence_model, gemma_tokenizer, gemma_pipeline
import re
def verify_answer(question, given_answer, label=None, from_csv=False):
    global_system_message = """
    You are an AI assistant responsible for verifying answers based solely on the given context. Analyze the provided answer carefully and respond appropriately.
    """

    # Use label-specific system message if provided
    system_message = label_system_messages.get(label, global_system_message)

    # Skip verification for answers obtained from CSV
    if from_csv:
        print(f"Skipping verification for question: {question} (answer obtained from CSV)")
        return "not_verified"

    print(f"Verifying the answer for question: {question}")

    # Retrieve context from ChromaDB
    results = collection.query(
        query_embeddings=[sentence_model.encode(question)],
        n_results=5,
        include=['metadatas', 'documents']
    )
    context_text = "\n\n---\n\n".join([doc for doc in results["documents"][0]])

    # Prepare the prompt
    prompt = f"""
    {system_message}

    Context:
    {context_text}

    Question: {question}
    Based on the context above, determine if the following answer is correct:

    Answer:
    {given_answer}

    Reply with only one word: "correct" if the answer matches the context and answers the question correctly, "incorrect" if the answer contradicts the context and does not answer the question correctly, or "uncertain" if there is not enough information in the context to verify the answer.
    """
    input_ids = gemma_tokenizer(prompt, return_tensors="pt").input_ids
    response = gemma_pipeline.generate(input_ids, max_new_tokens=50)
    response_text = gemma_tokenizer.decode(response[0], skip_special_tokens=True).lower().strip()

    # Extract verification result from model response
    explanation_match = re.search(r"\b(correct|incorrect|uncertain)\b", response_text)
    explanation = explanation_match.group(1).strip() if explanation_match else "uncertain"

    print(f"Extracted Explanation: {explanation}")

    return explanation
