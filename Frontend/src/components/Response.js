import React, { useState, useEffect, useContext, useCallback } from "react";
import axios from "axios";
import { message, Button, Card, Typography, Spin, Alert } from "antd";
import { SearchContext } from "./SearchContext";
import "../Styles/Response.css";
import { useLocation } from "react-router-dom";
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import Header from "./Header";
import copyIcon from "../Assets/copyIcon.png";
import checkIcon from "../Assets/checkIcon.png";
import Logger from "../utils/logger";

const { Title, Text } = Typography;

const Response = () => {
  const { searchText, setSearchText } = useContext(SearchContext);
  const location = useLocation();

  // Environment URLs
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const PY_MODEL_URL = process.env.REACT_APP_PY_MODEL_URL;

  // **State Management**
  const [response, setResponse] = useState("Appzillon");
  const [modifiedResponse, setModifiedResponse] = useState("Appzillon");
  const [query, setQuery] = useState(searchText || "");
  const [similarQuestions, setSimilarQuestions] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [errorSimilar, setErrorSimilar] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [copiedText, setCopiedText] = useState(null);
  const [visibleCount, setVisibleCount] = useState(4);
  const increment = 4;

  // **Define fetchSimilarQueries using useCallback first**
  const fetchSimilarQueries = useCallback(async () => {
    setLoadingSimilar(true);
    setErrorSimilar(null);

    try {
      Logger.debug("Fetching similar queries for", query);
      const res = await axios.post(`${PY_MODEL_URL}/similar_questions`, { query });
      const similar = res.data.similar_questions || [];
      setSimilarQuestions(similar);
      Logger.info("Fetched similar queries", similar);
    } catch (error) {
      const errMsg = error.response?.data?.message || "Something went wrong.";
      setErrorSimilar(errMsg);
      Logger.error("Error fetching similar queries", error);
    } finally {
      setLoadingSimilar(false);
    }
  }, [query, PY_MODEL_URL]);

  // **Set category from previous page**
  useEffect(() => {
    if (location.state?.selectedCategory) {
      setSelectedCategory(location.state.selectedCategory);
      Logger.info("Selected category from location state", location.state.selectedCategory);
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.generatedResponse) {
      setResponse(location.state.generatedResponse);
      setModifiedResponse(location.state.generatedResponse);
      Logger.info("Response received from location state", location.state.generatedResponse);
    }
  }, [location.state]);

  // **Set query from search context**
  useEffect(() => {
    setQuery(searchText);
    Logger.debug("Setting query from context", searchText);
  }, [searchText]);

  // **Fetch similar queries only when needed**
  useEffect(() => {
    if (query.trim()) {
      fetchSimilarQueries();
    }
  }, [query, fetchSimilarQueries]);

  // **Regenerate Response Handler**
  const handleRegenerateResponse = async () => {
    if (!query.trim() || !selectedCategory.trim()) {
      alert("Missing required data: query or category.");
      Logger.error("Regenerate failed due to missing query or category", { query, selectedCategory });
      return;
    }

    try {
      setLoadingSimilar(true); // Show loading state
      Logger.info("Regenerating response with query and category", { query, selectedCategory });
      
      const res = await fetch(`${PY_MODEL_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query, // The current query
          label: selectedCategory, // The selected category
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText}`);
      }

      const data = await res.json();
      setResponse(data.response); // Update the displayed response
      setModifiedResponse(data.response); // Update the modifiable response
      Logger.info("Regenerated response", data.response);
    } catch (error) {
      Logger.error("Error regenerating response", error);
      alert("Failed to regenerate response. Please try again.");
    } finally {
      setLoadingSimilar(false); // Hide loading state
    }
  };

// **Copy to Clipboard Handler with Fallback**
const handleCopy = useCallback((text) => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedText(text);
        Logger.info("Copied text to clipboard", text);
        setTimeout(() => setCopiedText(null), 2000);
      })
      .catch((error) => {
        Logger.error("Error copying text with navigator.clipboard", error);
        fallbackCopyText(text);
      });
  } else {
    fallbackCopyText(text);
  }
}, []);

const fallbackCopyText = (text) => {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      setCopiedText(text);
      Logger.info("Copied text to clipboard (fallback)", text);
      setTimeout(() => setCopiedText(null), 2000);
    } else {
      throw new Error("Fallback: Copy command was unsuccessful");
    }
  } catch (err) {
    Logger.error("Fallback: Oops, unable to copy", err);
  }
  document.body.removeChild(textArea);
};

  // **Handle Send Review**
  const handleSendReview = async () => {
    const userId = localStorage.getItem("userId");
    if (!query.trim() || !modifiedResponse.trim() || !userId) {
      message.error("Missing required data: question, answer, or user ID.");
      Logger.error("Send review failed: missing data", { query, modifiedResponse, userId });
      return;
    }

    const payload = {
      questionText: query,
      ReviewAnswer: response,
      modifiedResponse: modifiedResponse,
      userId: parseInt(userId, 10),
    };

    try {
      Logger.info("Sending review with payload", payload);
      const res = await axios.post(`${BASE_URL}/RFP/sendForReview`, payload);
      if (res.status === 200) {
        message.success("Review sent successfully!");
        Logger.info("Review sent successfully", res.data);
        setSearchText("");
        setQuery("");
        setModifiedResponse("");
      }
    } catch (error) {
      Logger.error("Error sending review", error);
      message.error("Failed to send review. Please try again.");
    }
  };

  return (
    <div>
      <Header />
      <div className="container2">
        {/* Query Section */}
        <div className="form-groupre">
          <label className="query-label-res">Query:</label>
          <div className="query-container-res">
            <div className="textarea-wrapper">
              <textarea
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  Logger.debug("Query updated", e.target.value);
                }}
                className="query-textarea-res"
              />
              <img
                src={copiedText === query ? checkIcon : copyIcon}
                alt="Copy"
                className="copy-icon"
                onClick={() => handleCopy(query)}
              />
              {copiedText === query && <span className="copied-message">Copied!</span>}
            </div>
          </div>
        </div>

        {/* Category Section */}
        <div className="form-groupre">
          <h4>Selected Category:</h4>
          <p className="selected-text-res">{selectedCategory}</p>
        </div>

        {/* Generated Response Section */}
        <div className="form-groupre">
          <label className="generated-label-res">Generated response:</label>
          <div className="generated-container-res">
            <div className="textarea-wrapper">
              <textarea value={response} readOnly className="response-textarea-res" />
              <img
                src={copiedText === response ? checkIcon : copyIcon}
                alt="Copy"
                className="copy-icon"
                onClick={() => handleCopy(response)}
              />
              {copiedText === response && <span className="copied-message">Copied!</span>}
            </div>
          </div>
        </div>

        {/* Modify Response Section */}
        <div className="form-groupre">
          <label className="modify-response-res">Modify response:</label>
          <div className="response-container-res">
            <div className="textarea-wrapper">
              <textarea
                value={modifiedResponse}
                onChange={(e) => {
                  setModifiedResponse(e.target.value);
                  Logger.debug("Modified response updated", e.target.value);
                }}
                className="response-textarea-res"
              />
              <img
                src={copiedText === modifiedResponse ? checkIcon : copyIcon}
                alt="Copy"
                className="copy-icon"
                onClick={() => handleCopy(modifiedResponse)}
              />
              {copiedText === modifiedResponse && <span className="copied-message">Copied!</span>}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="button-groupre">
          <Button className="send-review-btn-res" onClick={handleSendReview}>
            Send for Review
          </Button>
          <Button
            className="regenerate-btn-res"
            onClick={handleRegenerateResponse}
            disabled={loadingSimilar}
          >
            {loadingSimilar ? "Regenerating..." : "Regenerate Response"}
          </Button>
        </div>

        {/* Loading & Error Messages */}
        {loadingSimilar && <Spin className="loading-spin-res" />}
        {errorSimilar && (
          <Alert
            message={errorSimilar}
            type="error"
            showIcon
            className="error-alert-res"
          />
        )}

        {/* Similar Queries Section */}
        {similarQuestions.length > 0 && (
          <>
            <Title level={5} className="similar-title-res">
              Similar Queries:
            </Title>
            <div className="similar-queries-grid-res">
              {similarQuestions.slice(0, visibleCount).map((item, index) => (
                <Card key={index} size="small" className="similar-query-card-res">
                  <div className="card-container">
                    <div className="query-response-section">
                      <Text type="secondary">
                        <strong>Query:</strong>
                        <br />
                        {item.question}
                      </Text>
                      <br />
                      <Text type="secondary">
                        <strong>Response:</strong>
                        <br /> {item.answer}
                      </Text>
                    </div>
                    <div className="similarity-score-section">
                      <Text type="secondary">
                        <strong>Similarity Score:</strong>
                        <br /> {(item.similarity_score * 100)?.toFixed(0)}%
                      </Text>
                    </div>
                  </div>
                  <br />
                  <Button
                    type="link"
                    icon={copiedText === item.answer ? <CheckOutlined /> : <CopyOutlined />}
                    onClick={() => handleCopy(item.answer)}
                    className="copy-response-btn"
                  >
                    {copiedText === item.answer ? "Copied" : "Copy response"}
                  </Button>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* View More Button */}
        {visibleCount < similarQuestions.length && (
          <Button
            type="primary"
            onClick={() => {
              setVisibleCount(visibleCount + increment);
              Logger.debug("Viewing more similar queries", visibleCount + increment);
            }}
            className="view-more-res"
          >
            View More
          </Button>
        )}
      </div>
    </div>
  );
};

export default Response;
