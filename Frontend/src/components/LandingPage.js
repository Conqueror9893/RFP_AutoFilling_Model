import { Button, Modal } from "antd";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import FileUpload from "./FileUpload";
import RfpListTable from "./RfpListTable";
import "../Styles/LandingPage.css";
import Header from "./Header";
import Logger from "../utils/logger"; // Logger import

dayjs.extend(utc);
dayjs.extend(timezone);

const LandingPage = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  
  const location = useLocation();

  useEffect(() => {
    Logger.debug("LandingPage mounted", { userId });

    if (location.state?.openUploadModal) {
      Logger.info("Opening upload modal from redirected location");
      handleUploadModal();
    }
  }, [location]);

  if (!token) {
    Logger.error("Token not found. Redirecting to login.");
    navigate("/login");
  }

  const handleUploadModal = () => {
    Logger.info("Upload modal opened");
    setUploadModalVisible(true);
  };

  const handleCancelUpload = () => {
    Logger.info("Upload modal closed");
    setUploadModalVisible(false);
  };

  return (
    <div className="landing-container">
      <Header
	userId={userId} 
          token={token}
	 />
      
      <div className="content-container">
        <RfpListTable 
          userId={userId} 
          token={token} 
        />
         
        <div className="button-container">
          <Button 
            className="ask-query-button" 
            onClick={() => {
              Logger.info("Navigating to /search");
              navigate("/search");
            }}
          >
            Ask A Query
          </Button>

          <Button 
            className="enrich-response-button" 
            onClick={() => {
              Logger.info("Navigating to /enrich");
              navigate("/enrich");
            }}
          >
            Enrich Response
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
