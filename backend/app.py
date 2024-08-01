from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pandas as pd
import re
import os
import pickle
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from gensim.models import KeyedVectors
import io

# Load Google's pre-trained Word2Vec model.
word2vec = KeyedVectors.load_word2vec_format('backend/GoogleNews-vectors-negative300.bin.gz', binary=True)

app = Flask(__name__)
CORS(app)

# Initialize variables to hold the processed data
df = None
vectorizer = None
X = None
word2vec_vectors = None

# Paths to save pre-processed data
DATA_DIR = 'data'
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)
VECTOR_FILE = os.path.join(DATA_DIR, 'vectorizer.pkl')
DF_FILE = os.path.join(DATA_DIR, 'df.pkl')
X_FILE = os.path.join(DATA_DIR, 'X.pkl')
W2V_VECTORS_FILE = os.path.join(DATA_DIR, 'word2vec_vectors.pkl')

# Function to preprocess text
def preprocess_text(text):
    text = re.sub(r'\W', ' ', text)  # Remove special characters
    text = text.lower()  # Convert to lowercase
    text = re.sub(r'\s+', ' ', text)  # Remove extra spaces
    return text

# Function to get the average Word2Vec vector for a sentence
def get_avg_word2vec(sentence, model):
    words = sentence.split()
    word_vecs = []
    for word in words:
        if word in model:
            word_vecs.append(model[word])
    if len(word_vecs) == 0:
        return None
    return sum(word_vecs) / len(word_vecs)

# Function to find the most similar question with similarity scores
def find_similar_question_with_scores(new_question, vectorizer, X, df, word2vec, word2vec_vectors):
    new_question_vec = vectorizer.transform([new_question])
    tfidf_similarities = cosine_similarity(new_question_vec, X).flatten()

    new_question_w2v = get_avg_word2vec(new_question, word2vec)
    if new_question_w2v is not None:
        w2v_similarities = [cosine_similarity([new_question_w2v], [vec]).flatten()[0] if vec is not None else 0 for vec in word2vec_vectors]
    else:
        w2v_similarities = [0] * len(word2vec_vectors)

    combined_similarities = (tfidf_similarities + w2v_similarities) / 2
    top_indices = combined_similarities.argsort()[-5:][::-1]  # Get top 5 similar questions
    top_similarities = combined_similarities[top_indices]
    
    similar_questions = []
    for idx in top_indices:
        similar_questions.append({
            'question': df['Questions'][idx],
            'answer': df['Answer'][idx],
            'similarity_score': combined_similarities[idx]
        })
    
    return similar_questions

# Function to get answer with similarity score
def get_answer_with_similarity(new_question, vectorizer, X, df, word2vec, word2vec_vectors):
    preprocessed_question = preprocess_text(new_question)
    similar_questions = find_similar_question_with_scores(preprocessed_question, vectorizer, X, df, word2vec, word2vec_vectors)
    if similar_questions:
        return similar_questions[0]['answer'], similar_questions[0]['similarity_score']
    return "No similar question found.", 0

@app.route('/train', methods=['POST'])
def train_model():
    global df, vectorizer, X, word2vec_vectors
    if 'files' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    files = request.files.getlist('files')
    combined_df = pd.DataFrame()
    
    for file in files:
        if file.filename == '':
            return jsonify({'error': 'No file selected for uploading'}), 400

        try:
            temp_df = pd.read_excel(file)
            if 'Questions' not in temp_df.columns or 'Answer' not in temp_df.columns:
                print(f"Invalid file format: 'Questions' and 'Answer' columns missing in {file.filename}.")
                return jsonify({'error': f"Invalid file format in {file.filename}"}), 400

            combined_df = pd.concat([combined_df, temp_df], ignore_index=True)
        except Exception as e:
            return jsonify({'error': f'Error processing file: {str(e)}'}), 400

    try:
        df = combined_df
        df['Questions'] = df['Questions'].apply(preprocess_text)
        df['Answer'] = df['Answer'].apply(preprocess_text)

        vectorizer = TfidfVectorizer()
        X = vectorizer.fit_transform(df['Questions'])

        word2vec_vectors = [get_avg_word2vec(q, word2vec) for q in df['Questions']]

        with open(VECTOR_FILE, 'wb') as f:
            pickle.dump(vectorizer, f)
        with open(DF_FILE, 'wb') as f:
            pickle.dump(df, f)
        with open(X_FILE, 'wb') as f:
            pickle.dump(X, f)
        with open(W2V_VECTORS_FILE, 'wb') as f:
            pickle.dump(word2vec_vectors, f)

        return jsonify({'message': 'Model trained and data saved successfully'}), 200
    except Exception as e:
        return jsonify({'error': f'Error processing file: {str(e)}'}), 400

@app.route('/get-answer', methods=['POST'])
def get_answer_api():
    global df, vectorizer, X, word2vec_vectors

    if df is None or vectorizer is None or X is None or word2vec_vectors is None:
        if not os.path.exists(VECTOR_FILE) or not os.path.exists(DF_FILE) or not os.path.exists(X_FILE) or not os.path.exists(W2V_VECTORS_FILE):
            return jsonify({'error': 'Model not trained yet'}), 400
        
        with open(VECTOR_FILE, 'rb') as f:
            vectorizer = pickle.load(f)
        with open(DF_FILE, 'rb') as f:
            df = pickle.load(f)
        with open(X_FILE, 'rb') as f:
            X = pickle.load(f)
        with open(W2V_VECTORS_FILE, 'rb') as f:
            word2vec_vectors = pickle.load(f)

    data = request.json
    question = data['question']
    
    answer, similarity_score = get_answer_with_similarity(question, vectorizer, X, df, word2vec, word2vec_vectors)
    return jsonify({'answer': answer, 'similarity_score': similarity_score})

@app.route('/fill-answers', methods=['POST'])
def fill_answers():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400

    # Load pre-processed data
    with open(VECTOR_FILE, 'rb') as f:
        vectorizer = pickle.load(f)
    with open(DF_FILE, 'rb') as f:
        df = pickle.load(f)
    with open(X_FILE, 'rb') as f:
        X = pickle.load(f)
    with open(W2V_VECTORS_FILE, 'rb') as f:
        word2vec_vectors = pickle.load(f)

    try:
        df_input = pd.read_excel(file)

        if 'Questions' not in df_input.columns:
            return jsonify({'error': 'Invalid file format'}), 400

        df_input['PreprocessedQuestions'] = df_input['Questions'].apply(preprocess_text)
        results = df_input['PreprocessedQuestions'].apply(
            lambda q: get_answer_with_similarity(q, vectorizer, X, df, word2vec, word2vec_vectors)
        )

        df_input['Answer'] = [res[0] for res in results]
        df_input['SimilarityScore'] = [res[1] for res in results]

        # Remove the PreprocessedQuestions column to keep the original questions intact
        df_input.drop(columns=['PreprocessedQuestions'], inplace=True)

        output = io.BytesIO()
        df_input.to_excel(output, index=False)
        output.seek(0)

        return send_file(output, as_attachment=True, download_name='filled_answers_with_similarity.xlsx', mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    except Exception as e:
        print(f"Error processing file: {e}")
        return jsonify({'error': 'Error processing file'}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)
