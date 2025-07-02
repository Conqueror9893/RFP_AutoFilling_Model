import { useState, useEffect } from "react";
import { Button } from "antd";
import "../Styles/EnrichResponse.css"; 
import categoryData from "../data/category.json"; 
import { CopyOutlined, CheckOutlined } from "@ant-design/icons";
import Header from "./Header";
import adjustTextareaHeight from "./AskQueryPage"
import copyIcon from "../Assets/copyIcon.png"
import checkIcon from "../Assets/checkIcon.png"
const formData = {
  title: "Enrich Response",
  subtitle: "Refine. Enhance. Deliver Perfection.",
  query: {
    label: "Enter the query (Optional but recommended)",
    input: {
      type: "text",
      placeholder: "Type your query here",
    },
    categoryDropdown: {
      label: "Choose the Category",
      options: [] 
    }
  },
  response: {
    label: "Enter response you want to enrich",
    placeholder: "Type your response here..."
  },
  buttonText: "Enrich Response",
  enrichedResponse: {
    label: "Enriched Response",
    placeholder: "Appzillon..."
  }
};

export default function EnrichResponse() {
  const [categories, setCategories] = useState([]); 
  const [selectedCategory, setSelectedCategory] = useState(""); 
  const [response, setResponse] = useState("");
  const [enrichedResponse, setEnrichedResponse] = useState("");
  const [loading, setLoading] = useState(false);

  let [copiedText, setCopiedText] = useState(null);
  const [modifiedResponse, setModifiedResponse] = useState("Appzillon");
  
  const categoryDescriptions = categoryData.categories.reduce((acc, item) => {
    acc[item.title] = item.description;
    return acc;
  }, {});

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("http://localhost:8085/RFP/getAllCategory", {
          method: "POST",
          headers: { "Content-Type": "application/json" }
        });
  
        const data = await res.json();
        if (Array.isArray(data)) {
          const categoryList = ["None", ...data.map((item) => item.categoryName)];
          setCategories(categoryList);
          setSelectedCategory("None"); 
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
  
    fetchCategories();
  }, []);
  

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const requestBody = {
        query: response,
        label: selectedCategory,
        response_to_enrich: response
      };

      const res = await fetch("http://localhost:8000/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (res.ok) {
        setEnrichedResponse(data.enriched_response);
      } else {
        throw new Error(data.error || "Failed to enrich response");
      }
    } catch (error) {
      console.error("Error:", error);
      setEnrichedResponse("Error occurred while enriching response");
    } finally {
      setLoading(false);
    }
  };
  const handleCopy = (text) => {
    if (!text) return; 
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedText(text);
        setTimeout(() => setCopiedText(null), 2000); 
      })
      .catch((err) => console.error("Failed to copy:", err));
  };

  return (
    <div>
      <Header />
      <div className="carden">
        <h1 className="titleen">{formData.title}</h1>
        <p className="subtitleen">{formData.subtitle}</p>

        <label className="labelenr">{formData.query.label}</label>
       
        <textarea
          className="inputen query-input"
          placeholder={formData.query.input.placeholder}
        />

        <div>
          <label className="labelen">{formData.query.categoryDropdown.label}</label>
    
          <select
            className="selecten"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="enrich-response-category-description">
          {categoryDescriptions[selectedCategory] && (
            <div>
              <h3>Description for {selectedCategory}</h3>
              <ul>
                {Array.isArray(categoryDescriptions[selectedCategory])
                  ? categoryDescriptions[selectedCategory].map((desc, index) => (
                      <li key={index}>{desc}</li>
                    ))
                  : <li>{categoryDescriptions[selectedCategory]}</li>}
              </ul>
            </div>
          )}
        </div>

        <label className="labelen">{formData.response.label}</label>
        
        <textarea
          className="textareaen inputen"
          placeholder={formData.response.placeholder}
          value={response}
          onChange={(e) => setResponse(e.target.value)}
        />
        <div className="enrich-button-container">
        <button className="buttonenen" onClick={handleSubmit} disabled={loading}>
          {loading ? "Processing..." : formData.buttonText}
        </button>
        </div>
        
        <label className="labelen">{formData.enrichedResponse.label}</label>
    
        <div className="textarea-containeren">
          <textarea
            className="textareaen"
            placeholder={formData.enrichedResponse.placeholder}
            value={enrichedResponse}
            readOnly
            onChange={(e) => setModifiedResponse(e.target.value)}
            onInput={adjustTextareaHeight}
          />
         <img
            src={copiedText === enrichedResponse ? checkIcon : copyIcon}
            alt="Copy"
            className="enriched-response-copy-icon"
            onClick={() => handleCopy(enrichedResponse)}
          />
          {copiedText === enrichedResponse && <span className="enriched-response-copied-message">Copied!</span>}
        </div>
      </div>
    </div>
  );
}
