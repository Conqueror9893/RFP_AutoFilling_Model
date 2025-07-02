import React, { useState } from "react";
import * as XLSX from "xlsx";
import "../Styles/FileUpload.css";
import categoryData from "../data/category.json"; 
import uploadIcon from "../Assets/uploadIcon.png";
import linkIcon from "../Assets/linkIcon.png";
import deleteIcon from "../Assets/deleteIcon.png";
import Logger from "../utils/logger";

const FileUpload = () => {
  const [file, setFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [responseGenerated, setResponseGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [templateData, setTemplateData] = useState([]);
  const [showCategories, setShowCategories] = useState(true);
  const [description, setDescription] = useState("");
  const [rfpName, setRfpName] = useState("");
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const PY_MODEL_URL = process.env.REACT_APP_PY_MODEL_URL;

  const showToast = (message, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
  };

  const fetchCategories = async () => {
    try {
      Logger.debug("Fetching categories...");
      const response = await fetch(`${BASE_URL}/RFP/getAllCategory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
     
      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }
      const data = await response.json();
      const fetchedCategories = ["None", ...data.map((item) => item.categoryName)];
      setCategories(fetchedCategories);
      Logger.info("Categories fetched", fetchedCategories);
    } catch (error) {
      Logger.error("Error fetching categories", error);
      showToast("Error fetching categories", "error");
    }
  };

  const handleCategoryChange = (e) => {
    const selected = e.target.value;
    setSelectedCategory(selected);
    const matchedCategory = categoryData.categories.find((item) => {
      const normalizedTitle = item.title.trim().toLowerCase();
      const normalizedSelected = selected.trim().toLowerCase();
      return normalizedTitle === normalizedSelected;
    });

    if (matchedCategory) {
      setDescription(matchedCategory.description);
      Logger.info("Category changed", { selected, description: matchedCategory.description });
    } else {
      setDescription("No description available.");
      Logger.info("Category changed with no match", selected);
    }
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      const fileType = uploadedFile.name.split(".").pop().toLowerCase();
      if (fileType !== "xls" && fileType !== "xlsx") {
        showToast("Only Excel files (.xls, .xlsx) are allowed!", "error");
        Logger.error("Invalid file type uploaded", uploadedFile.name);
        return;
      }

      setFile(uploadedFile);
      setRfpName(uploadedFile.name.replace(/\.[^/.]+$/, ""));      
      Logger.info("File uploaded", uploadedFile.name);
      processExcelFile(uploadedFile);
      fetchCategories();
      showToast(`${uploadedFile.name} uploaded successfully!`);
    }
  };

  const processExcelFile = (file) => {
    try {
      const reader = new FileReader();
      reader.readAsBinaryString(file);
      reader.onload = (e) => {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        if (!jsonData || jsonData.length === 0) {
          showToast("No data found in the uploaded file.", "error");
          Logger.error("No data in excel file");
          return;
        }

        const normalizedColumns = Object.keys(jsonData[0]).map((col) => col.trim().toLowerCase());
        const queriesColumnIndex = normalizedColumns.indexOf("query");

        if (queriesColumnIndex === -1) {
          showToast("Uploaded file must have a 'Queries' column!", "error");
          Logger.error("Queries column missing in file");
          return;
        }

        const extractedQueries = jsonData.map((row) => ({
          Queries: row[Object.keys(jsonData[0])[queriesColumnIndex]],
        }));
        setTemplateData(extractedQueries);
        setGeneratedFile("Query_Template.xlsx");
        Logger.info("Excel file processed successfully", extractedQueries);
      };
    } catch (error) {
      Logger.error("Error processing Excel file", error);
      showToast("Error processing Excel file", "error");
    }
  };

  const generateResponse = async () => {
    setIsGenerating(true);
    try {
      const username = localStorage.getItem("userName") || "Unknown User";

      const formData = new FormData();
      formData.append("rfp_name", rfpName);
      formData.append("uploaded_by", username);
      formData.append("file", file);
      formData.append("user_id", localStorage.getItem("userId") || "1");

      Logger.debug("Uploading RFP", { rfpName, username });
      const uploadResponse = await fetch(`${PY_MODEL_URL}/upload_rfp/`, {
        method: "POST",
        body: formData,
      });
      Logger.info(uploadResponse.response);
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload RFP");
      }

      const uploadData = await uploadResponse.json();
      showToast(`File uploaded successfully! (Version ${uploadData.version})`);
      Logger.info("File uploaded", uploadData);

      const rfpid = uploadData.rfpid;
      if (!rfpid) {
        throw new Error("RFP ID not received from backend.");
      }

      await downloadFile(rfpid);
      setResponseGenerated(true);
      setUploadModalVisible(false);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      Logger.error("Error generating response", error);
      showToast(error.message || "Error processing RFP", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadFile = async (rfpid) => {
    try {
      Logger.debug("Downloading file for RFP ID", rfpid);
      const response = await fetch(`${BASE_URL}/RFP/download/${rfpid}`, {
        method: "GET",
        headers: {
          "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download the file");
      }

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "response_file.xlsx";
      link.click();

      showToast("File downloaded successfully!");
      Logger.info("File downloaded successfully for RFP ID", rfpid);
    } catch (error) {
      Logger.error("Error downloading file", error);
      showToast("Error downloading the file", "error");
    }
  };

  return (
    <div className="containerup">
      <h1 className="headerup">Upload</h1>

      <div className="file-upload-containerup">
        <div className="fileup">
          <div className="imageup1">
            <img className="imageup2" src={uploadIcon} alt="Document Upload" />
          </div>
          <div className="groupup1">
            <h5 className="h5up">Drag and drop files here</h5>
            <p className="pup">Limit 200MB per file - XLSX, CSV</p>
          </div>
        </div>

        <div className="uploaded-fileup">
          <input
            type="file"
            id="fileInput"
            onChange={handleFileUpload}
            className="file-inputup"
            accept=".xls,.xlsx,.csv"
          />
          <label htmlFor="fileInput" className="custom-file-buttonup">
            Browse Files
          </label>
        </div>
      </div>
      
      {file && (
        <div className="file-previewup">
          <span className="iconup">??</span>
          <span className="file-nameup">&nbsp;&nbsp;{file.name}</span>
          <span className="file-sizeup">&nbsp;&nbsp;{(file.size / 1024).toFixed(1)} KB</span>
          <span
            className="icon delete-iconup"
            onClick={() => {
              setFile(null);
              showToast("File deleted successfully!", "error");
              Logger.info("File deleted", file.name);
            }}
          >
            <button className="delete-buttonup">
              <img
                className="delete-imageup"
                src={deleteIcon}
                alt="Delete Button"
                onClick={() => setShowCategories(!showCategories)}
              />
            </button>
          </span>
        </div>
      )}

      {showCategories && categories.length > 0 && (
        <div className="cardup">
          <h4>Select the label for the attached file (optional)</h4>
          <select 
            className="cateup"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              handleCategoryChange(e);
            }}
          >
            <option value="" disabled>
              None
            </option>
            {categories.map((category, index) => (
              <option key={index} value={category}>
                {category}
              </option>
            ))}
          </select>
          {description && (
            <div>
              {Array.isArray(description)
                ? description.map((item, index) => (
                    <p key={index} className="category-description">
                      {item}
                    </p>
                  ))
                : <p className="category-description">{description}</p>}
            </div>
          )}
        </div>
      )}

      {file && (
        <div className="rfp-name-container">
          <br />
          <label className="rfp-name-label">
            <strong>Confirm or Edit RFP Name:</strong>
          </label>
          <br />
          <input
            type="text"
            className="rfp-name-input"
            value={rfpName}
            onChange={(e) => setRfpName(e.target.value)}
          />
        </div>
      )}
    
      <button onClick={generateResponse} className="btn primary-btn" disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Generate & Download Response"}
      </button>
     
      {isGenerating && <div className="loader"></div>}
    </div>
  );
};

export default FileUpload;
