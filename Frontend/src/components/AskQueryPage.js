import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SearchContext } from "./SearchContext";
import "../Styles/AskQueryPage.css";
import categoryData from "../data/category.json";
import Header from "./Header";
import Logger from "../utils/logger";

const AskQueryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { searchText, setSearchText, selectedCategory, setSelectedCate } = useContext(SearchContext);

  const [inputValue, setInputValue] = useState(searchText || "");
  const [file, setFile] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [categories, setCategories] = useState([]);
  const [predictedCategory, setPredictedCategory] = useState("");
  const [categoryDescriptions, setCategoryDescriptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [description, setDescription] = useState("");
  const textareaRef = useRef(null);

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const PY_MODEL_URL = process.env.REACT_APP_PY_MODEL_URL;

  useEffect(() => {
    if (location.state?.inputValue) {
      setInputValue(location.state.inputValue);
      setSearchText(location.state.inputValue);
    }
  }, [location.state?.inputValue, setSearchText]);

  useEffect(() => {
    fetchCategories();
    loadCategoryDescriptions();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${BASE_URL}/RFP/getAllCategory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to fetch categories");

      const data = await response.json();
      const categoryNames = data.map((item) => item.categoryName);
      setCategories(categoryNames);

      Logger.info("Fetched categories successfully", categoryNames);
    } catch (error) {
      Logger.error("Error fetching categories", error);
      alert("Failed to load categories.");
    }
  };

  const loadCategoryDescriptions = () => {
    try {
      const descriptions = {};
      categoryData.categories.forEach((item) => {
        descriptions[item.title] = item.description.join("\n");
      });
      setCategoryDescriptions(descriptions);
      Logger.debug("Category descriptions loaded", descriptions);
    } catch (error) {
      Logger.error("Error loading category descriptions", error);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    setSearchText(value);
    adjustTextareaHeight();
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile) return;
    if (file && file.name === uploadedFile.name && file.size === uploadedFile.size) {
      alert("This file is already uploaded.");
      return;
    }
    setFile(uploadedFile);
    Logger.info("File uploaded", uploadedFile.name);
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleGetCategory = async () => {
    if (!inputValue.trim()) {
      alert("Please enter text before getting categories.");
      return;
    }

    setLoading(true);
    setShowCategories(true);

    try {
      const response = await fetch(`${PY_MODEL_URL}/get_category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: inputValue }),
      });

      if (!response.ok) throw new Error("Failed to fetch category");

      const data = await response.json();
      const newPredictedCategory = data.predicted_class || "None";
      setPredictedCategory(newPredictedCategory);
      setSelectedCate(newPredictedCategory);

      // Add category to dropdown if not already present
      setCategories((prevCategories) =>
        prevCategories.includes(newPredictedCategory) ? prevCategories : [...prevCategories, newPredictedCategory]
      );

      Logger.info("Predicted category", newPredictedCategory);
    } catch (error) {
      Logger.error("Error fetching predicted category", error);
      alert("Error fetching category");
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (e) => {
    const selected = e.target.value;
    setSelectedCate(selected);

    const matchedCategory = categoryData.categories.find((item) => {
      const normalizedTitle = item.title.trim().toLowerCase();
      const normalizedSelected = selected.trim().toLowerCase();
      return normalizedTitle === normalizedSelected;
    });

    if (matchedCategory) {
      setDescription(matchedCategory.description);
    } else {
      setDescription(["No description available."]);
    }

    Logger.info("Category selected", selected);
  };

  const handleGenerateResponse = async () => {
    if (!selectedCategory) {
      alert("Please select a category first.");
      return;
    }

    try {
      setLoadingResponse(true);

      const response = await fetch(`${PY_MODEL_URL}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: inputValue,
          label: selectedCategory,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      const generatedResponse = data.response;

      Logger.info("Generated response successfully", generatedResponse);

      navigate("/response", {
        state: {
          inputValue,
          selectedCategory,
          generatedResponse,
        },
      });
    } catch (error) {
      Logger.error("Error generating response", error);
      alert("Failed to generate response. Please try again.");
    } finally {
      setLoadingResponse(false);
    }
  };

  return (
    <div className="searchGenerateContainer">
      <Header />
      <div className="container-sep">
        <h1 className="heading-sep">
          Tell me what you're looking for, and I'll help you find it in no time!
        </h1>

        <div className="textarea-button-container">
          <textarea
            ref={textareaRef}
            className="textarea-se"
            placeholder="?? Enter your query here..."
            value={inputValue}
            onChange={handleChange}
            onInput={adjustTextareaHeight}
          />

          <button className="get-category-btn-se" onClick={handleGetCategory} disabled={loading}>
            {loading ? "Loading..." : "Get Category"}
          </button>
        </div>

        {showCategories && (
          <div className="category-section">
            <h3 className="predicted-category-header">Related Category:</h3>
            <p className="predicted-category-text">
              Predicted Category: <strong>{loading ? "Loading..." : predictedCategory}</strong>
            </p>

            <label className="category-label">Select a different category:</label><br />
            <select className="dropdown-se" onChange={handleCategoryChange} value={selectedCategory}>
              {categories.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedCategory && (
          <div className="category-info">
            <p>
              Selected Category: <strong>{selectedCategory}</strong>
            </p>
            {description && (
              <div>
                {description.map((item, index) => (
                  <p key={index} className="category-description">
                    {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedCategory && (
          <button
            className="generate-btn-se"
            onClick={handleGenerateResponse}
            disabled={loadingResponse}
          >
            {loadingResponse ? "Generating..." : "Generate Response"}
          </button>
        )}
      </div>
    </div>
  );
};

export default AskQueryPage;
