import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/CombinedComponent.css';

const CombinedComponent = () => {
  const [file, setFile] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [similarityScore, setSimilarityScore] = useState(null);
  const [loadingQuestion, setLoadingQuestion] = useState(false);

  const handleSubmitFile = async (event) => {
    event.preventDefault();
    setLoadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('http://localhost:5000/fill-answers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadUrl(url);
    } catch (error) {
      console.error('Error filling answers:', error);
      alert('Error filling answers');
    }
    setLoadingFile(false);
  };

  const handleQuestionSubmit = async (event) => {
    event.preventDefault();
    setLoadingQuestion(true);
    try {
      const response = await axios.post('http://localhost:5000/get-answer', { question });
      setAnswer(response.data.answer);
      setSimilarityScore(response.data.similarity_score);
    } catch (error) {
      console.error('Error getting answer:', error);
      alert('Error getting answer');
    }
    setLoadingQuestion(false);
  };

  return (
    <div className="combined-component-container">
      <div className="combined-component">
        <h2>Ask a Question</h2>
        <form onSubmit={handleQuestionSubmit}>
          <div>
            <label>Question:</label>
            <input type="text" value={question} onChange={(e) => setQuestion(e.target.value)} required />
          </div>
          <button type="submit" disabled={loadingQuestion}>
            {loadingQuestion ? 'Getting Answer...' : 'Submit'}
          </button>
        </form>
        {answer && (
          <div className="answer">
            <strong>Answer:</strong> {answer}
          </div>
        )}
        {similarityScore !== null && (
          <div className="similarity-score">
            <strong>Similarity Score:</strong> {similarityScore.toFixed(2)}
          </div>
        )}

        <h2>Fill Answers in Excel Using RFPAutoFillingModel</h2>
        <form onSubmit={handleSubmitFile}>
          <div>
            <label>Upload Excel File:</label>
            <input type="file" accept=".xlsx, .xls" onChange={(e) => setFile(e.target.files[0])} required />
          </div>
          <button type="submit" disabled={loadingFile}>
            {loadingFile ? 'Filling Answers...' : 'Submit'}
          </button>
        </form>
        {downloadUrl && (
          <div>
            <a href={downloadUrl} download="filled_answers.xlsx">Download Filled Excel File</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default CombinedComponent;
