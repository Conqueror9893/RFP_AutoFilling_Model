import React from 'react';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import FileUpload from './components/FileUpload';
import './App.css';
import '../styles.css';
import CombinedComponent from './components/CombinedComponent';
const App = () => {
  return (
    <Router>
    <div className="App">
      <Routes>
        <Route path="/" element={<FileUpload />} />
        <Route path="/CombinedComponent" element={<CombinedComponent />} />
      </Routes>
    </div>
    </Router>
  );
};

export default App;
