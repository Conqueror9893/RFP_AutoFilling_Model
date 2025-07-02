import axios from "axios";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Login.css";
import viewIcon from "../Assets/viewIcon.png";
import Logger from "../utils/logger";
const Login = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

useEffect(() => {
  Logger.debug("Checking user session");
  axios.get(`${process.env.REACT_APP_BASE_URL}/api/profile`, { withCredentials: true })
    .then((res) => {
      Logger.info("User session found", res.data);
      setUser(res.data);
    })
    .catch((err) => {
      Logger.error("Failed to fetch user session", err);
      setUser(null);
    });
}, []);

 const handleMicrosoftLogin = () => {
  Logger.info("Redirecting to Microsoft login");
  window.location.href = `${process.env.REACT_APP_BASE_URL}/oauth2/authorization/microsoft`;
};

const handleLogin = async () => {
  Logger.debug("Attempting login", { username });
  try {
    const response = await axios.post(`${process.env.REACT_APP_BASE_URL}/auth/login`, {
      username,
      password,
    });
    Logger.info("Login successful", response.data);
    localStorage.setItem("token", response.data.token);
    localStorage.setItem("userId", response.data.userId);
    localStorage.setItem("userName", response.data.userName);
    localStorage.setItem("role", response.data.role);
    if (response.data.role === "ADMIN") {
      navigate("/review-queries");
    } else {
      navigate("/landing");
    }
  } catch (error) {
    Logger.error("Login failed", error);
    setError("Invalid credentials. Please try again.");
  }
};

  return (
    <div className="containerlo">
      <div className="image-wrapperlo">
        <img
          className="company-logolo"
          src="https://www.i-exceed.com/wp-content/uploads/2022/08/i-exceed-Hi-Res-copy-1.png"
          alt="i-exceed-Hi-Res"
        />

        <div className="rfp-maintenance">
          <h1 className="rfp-title">RFP Cruncher</h1>
          <p className="rfp-subtitle">Login with credentials</p>
        </div>
      </div>
      <div className="login-text-container">
        <label className="username-label">Username</label>
        <input
          type="text"
          placeholder="Enter the user ID"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="inputStyle"
        />

        <label className="password-label">Password</label>
        <input
          type={showPassword ? "text" : "password"}
          placeholder="Enter the password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="inputStyle password-input"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="toggle-password-btn"
        >
          <img
            className="toggle-password-icon"
            src={viewIcon}
            alt={showPassword ? "Hide Password" : "Show Password"}
          />
        </button>

        <button onClick={handleLogin} className="buttonStyle">
          Sign In
        </button>

        <h3 className="or-heading">or</h3>

        {error && <p className="errorStyle">{error}</p>}

        <div>
          <button className="microsoft" onClick={handleMicrosoftLogin}>
            <strong>Sign in with Microsoft</strong>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
