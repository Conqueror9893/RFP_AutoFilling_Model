import React from "react";
import axios from "axios";
import "../Styles/Header.css";
import { useLocation, useNavigate } from "react-router-dom";
import backIcon from "../Assets/backIcon.png";
import logoutIcon from "../Assets/logoutIcon.png";
import Logger from "../utils/logger";

export default function Header({token}) {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = localStorage.getItem("userName") || "Guest";
  const BASE_URL = process.env.REACT_APP_BASE_URL;

  const handleLogout = async () => {
    try {
      Logger.debug("Attempting to logout...");
      const response = await axios.post(
        `${BASE_URL}/RFP/auth/logout`,
        {},
        {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`, // audit token passed correctly
          },
        }
      );
      Logger.info("Logout API Response", response);

      if (response.status === 200) {
        Logger.info("Logout successful, clearing localStorage...");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        localStorage.removeItem("userName");
        window.location.href = "/";
      } else {
        Logger.error("Logout failed with status", response.status);
      }
    } catch (error) {
      Logger.error("Logout error", error);
      if (error.response) {
        Logger.error("Error response data", error.response.data);
        Logger.error("Error status", error.response.status);
      } else {
        Logger.error("No response from server", null);
      }
    }
  };

  const handleBack = () => {
    if (location.pathname === "/landing") {
      if (
        window.confirm(
          "Are you sure you want to logout and go back to the login page?"
        )
      ) {
        handleLogout();
      }
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="headerfo">
      <div className="header-containerfo">
        <div>
          <button onClick={handleBack} className="back-buttonfo">
            <img src={backIcon} alt="Back Button" className="logo-iconfo" />
          </button>
          <img
            src="https://www.i-exceed.com/wp-content/uploads/2022/08/i-exceed-Hi-Res-copy-1.png"
            alt="Company Logo"
            className="company-logofo"
          />
        </div>

        <div className="user-profilefo">
          <img
            src="https://img.icons8.com/?size=100&id=26&format=png&color=000000"
            alt="User Profile"
            className="user-iconfo"
          />
          <span className="user-name">
            {userName.replace(/\s+/g, ".").toLowerCase()}@i-exceed.com
          </span>

          <button onClick={handleLogout} className="logout-buttonfo">
            <img src={logoutIcon} alt="Logout Button" className="logout-iconfo" />
          </button>
        </div>
      </div>
      <div className="header-dividerfo"></div>
    </header>
  );
}
