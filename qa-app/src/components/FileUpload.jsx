import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../css/FileUpload.css';

const FileUpload = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setFiles(Array.from(event.target.files));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    setLoading(true);
    try {
      const response = await axios.post('http://127.0.0.1:5000/train', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Files uploaded successfully:', response.data);
      navigate('/CombinedComponent');
    } catch (error) {
      console.error('Error uploading files:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response:', error.response.data);
        alert(`Error: ${error.response.data.error || 'Unknown error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        alert('Error: No response received from server.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        alert(`Error: ${error.message}`);
      }
    }

    setLoading(false);
  };

  return (
    <div className="file-upload-container">
      <div className="file-upload">
        <h1>DumbSyed V01I02</h1>
        <h2>Upload Files to Train RFPAutoFillingModel</h2>
        <p>Please upload your Excel files to train the model. The files should contain the questions for which you need the answers filled.</p>
        <form onSubmit={handleSubmit}>
          <input type="file" multiple onChange={handleFileChange} />
          <button type="submit" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Files'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FileUpload;
