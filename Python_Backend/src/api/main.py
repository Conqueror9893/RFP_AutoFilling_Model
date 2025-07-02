from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel
from datetime import datetime
import os
import pandas as pd
import io
import numpy as np
from typing import List
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.automap import automap_base
from dotenv import load_dotenv
from ..intent_classification.train import train_model
from ..intent_classification.test import test_model
from ..llm.response_generator import generate_response, run_ollama_model, normalize_text, sentence_model, cosine_similarity
from ..utils.config import load_answers_from_excel, EXCEL_ANSWERED_QUESTIONS_PATH, save_answers_to_excel

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "root")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "RFPcruncher")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = automap_base()
Base.prepare(engine, reflect=True)

RFP = Base.classes.rfp

class QueryRequest(BaseModel):
    query: str

class GenerateRequest(BaseModel):
    query: str
    label: str

class EnrichRequest(BaseModel):
    query: str
    label: str
    response_to_enrich: str

class SimilarQuestionResponse(BaseModel):
    query: str
    similar_questions: List[dict] 

class SaveAnswerRequest(BaseModel):
    query: str
    answer: str

class RFPMetadata(BaseModel):
    rfp_name: str
    uploaded_by: str
    version: str

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/train")
def train():
    train_model()
    return {"status": "training_completed"}

@app.post("/get_category")
def test(request: QueryRequest):
    query = request.query
    result = test_model(query)
    return {"predicted_class": result}

@app.post("/generate")
def generate(request: GenerateRequest):
    query = request.query
    label = request.label
    qa_pairs = load_answers_from_excel(EXCEL_ANSWERED_QUESTIONS_PATH)
    response = generate_response(query, qa_pairs, label=label)
    return {"response": response}

@app.post("/enrich")
def enrich_response(request: EnrichRequest):
    query = request.query
    label = request.label
    response_to_enrich = request.response_to_enrich

    enrichment_prompt = f"""
    You are a professional assistant. Please refine the following response to be more comprehensive and professional.
    Query: {query}
    Label: {label}
    Original Response: {response_to_enrich}

    Enriched Response:
    """

    try:
        enriched_response = run_ollama_model(enrichment_prompt)
        enriched_text = enriched_response.split("Enriched Response:")[-1].strip()
        return {"enriched_response": enriched_text}
    except Exception as e:
        return {"error": str(e)}

@app.post("/similar_questions", response_model=SimilarQuestionResponse)
async def fetch_similar_questions(request: QueryRequest):
    query = request.query
    qa_pairs = load_answers_from_excel(EXCEL_ANSWERED_QUESTIONS_PATH)
    normalized_query = normalize_text(query)
    existing_queries = [normalize_text(q) for q in qa_pairs.keys()]
    query_embedding = sentence_model.encode([normalized_query])
    existing_embeddings = sentence_model.encode(existing_queries)
    similarities = cosine_similarity(query_embedding, existing_embeddings)[0]
    sorted_indices = np.argsort(similarities)[::-1]

    similar_questions = []
    for idx in sorted_indices[:5]:
        similar_questions.append({
            "question": existing_queries[idx],
            "answer": qa_pairs[existing_queries[idx]],
            "similarity_score": float(similarities[idx])
        })

    return {"query": query, "similar_questions": similar_questions}

@app.post("/save_answer")
def save_answer(request: SaveAnswerRequest):
    query = request.query
    answer = request.answer

    if os.path.exists(EXCEL_ANSWERED_QUESTIONS_PATH):
        qa_pairs = load_answers_from_excel(EXCEL_ANSWERED_QUESTIONS_PATH)
    else:
        qa_pairs = {}

    qa_pairs[query] = answer

    try:
        save_answers_to_excel(qa_pairs, EXCEL_ANSWERED_QUESTIONS_PATH)
        return {"status": "success", "message": "Answer saved successfully."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


   

@app.post("/upload_rfp/")
async def upload_rfp(
    rfp_name: str = Form(...),
    uploaded_by: str = Form(...),
    version: str = Form(None),
    file: UploadFile = File(...),
    user_id: str = Form(...)
):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))

        if "query" not in df.columns:
            raise HTTPException(status_code=400, detail="The file must contain a 'query' column.")

        qa_pairs = {}
        if os.path.exists(EXCEL_ANSWERED_QUESTIONS_PATH):
            qa_pairs = load_answers_from_excel(EXCEL_ANSWERED_QUESTIONS_PATH)

        # Generate answers for queries
        def get_or_generate_answer(query):
            if query in qa_pairs:
                return qa_pairs[query]
            else:
                answer = generate_response(query, qa_pairs) 
                qa_pairs[query] = answer 
                return answer
        
        df["answer"] = df["query"].apply(get_or_generate_answer)

        # Save the filled RFP file
        filled_rfp_path = f"./local_folder/filled_rfp_{rfp_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}.xlsx"
        df.to_excel(filled_rfp_path, index=False, engine="openpyxl")

        session = SessionLocal()


        existing_rfp = session.query(RFP).filter(RFP.rfpname == rfp_name).order_by(desc(RFP.version)).first()

        if existing_rfp:
            try:
                latest_version = float(existing_rfp.version)
                new_version = f"{latest_version + 1.0:.1f}"
            except ValueError:
                new_version = "2.0" 
        else:
            new_version = "1.0" 

        new_rfp = RFP(
            rfpname=rfp_name,
            last_updated=datetime.now(),
            uploaded_by=uploaded_by,
            version=new_version,
            current_file=contents,
            download_file=open(filled_rfp_path, "rb").read(), 
            current_file_timestamp=datetime.now(),
            user_id=user_id
        )
        session.add(new_rfp)
        session.commit()
        session.refresh(new_rfp) 
        rfp_id = new_rfp.rfpid 
        session.close()

        return {
            "message": "RFP processed successfully",
            "download_path": filled_rfp_path,
            "rfpid": rfp_id,
            "version": new_version  
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))