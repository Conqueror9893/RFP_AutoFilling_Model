import React, { useState } from 'react';
import axios from 'axios';

const AskQuestion = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/get-answer', { question });
      setAnswer(response.data.answer);
    } catch (error) {
      console.error('Error getting answer:', error);
      setAnswer('Error getting answer.');
    }

    setLoading(false);
  };

  return (
    <div className="ask-questions">
      <h2>Ask a Question</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Your Question:</label>
          <input
            type="text"
            value={question}
            onChange={handleQuestionChange}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Getting Answer...' : 'Get Answer'}
        </button>
      </form>
      {answer && (
        <div className="answer">
          <h3>Answer:</h3>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
};

export default AskQuestion;
