import axios from "axios";
import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify"; 
import "react-toastify/dist/ReactToastify.css";  
import "../Styles/AdminReviewQueries.css"; 
import Header from "./Header";
import logger from "../utils/logger"; 
import { diffWords } from "diff";

const ReviewQueries = () => {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const BASE_URL = process.env.REACT_APP_BASE_URL;

  // Helper function to compute and render differences
  const renderDiff = (original, modified) => {
  	const diff = diffWords(original, modified);
  	return diff.map((part, index) => {
    	let className = "diff-unchanged";
    	if (part.added) {
    	  className = "diff-added";
    	} else if (part.removed) {
   	   className = "diff-removed";
    	}
    	return (
   	   <span key={index} className={className}>
   	     {part.value}
   	   </span>
   	 );
  	});
	};
  useEffect(() => {
    const fetchQueries = async () => {
      try {
        logger.debug("Fetching review queries...");
        const response = await axios.post(`${BASE_URL}/RFP/getAllReviewQueries`);
        const filtered = response.data.filter(query => query.status === null);
        setQueries(filtered);
        logger.info("Fetched review queries", filtered);
      } catch (err) {
        setError("Failed to fetch queries!");
        logger.error("Error fetching queries", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQueries();
  }, [BASE_URL]);

  const handleStatusChange = async (questionId, status) => {
    try {
      logger.debug(`Updating status for questionId=${questionId} to '${status}'`);
      const response = await axios.post(`${BASE_URL}/RFP/reviewStatus`, {
        questionId: Number(questionId),
        status
      });
      toast.success(response.data.message); 
      setQueries((prevQueries) =>
        prevQueries.filter(query => query.questionId !== Number(questionId))
      );
      logger.info("Updated review status", { questionId, status });
    } catch (err) {
      toast.error("Failed to update the status!"); 
      logger.error("Error updating review status", err);
    }
  };

  if (loading) return <p className="loading">Loading...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <>
      <Header />
      <div className="containerqu">
        <h1>Review Responses</h1>

        {queries.length === 0 ? (  
          <p className="no-queries">Nothing to review today. Enjoy your day!</p>  
        ) : (
          queries.map((query) => (
            <div key={query.questionId} className="query-cardqu">
              <div className="que1">
                <p className="query-labelqu uploader">
                  <strong>Uploaded By:</strong> {query.user.username}
                </p>
                <p className="query-labelqu timestamp">
                  <strong>Uploaded On:</strong> {new Date(query.timestamp).toLocaleString()}
                </p>

                <p className="query-labelqu">Query:</p>
                <p className="query-textqu">{query.query}</p>

                <p className="query-labelqu">Generated Response:</p>
                <p className="query-textqu">{query.response}</p>

                <p className="query-labelqu modi">Modified Response:</p>
                <p className="query-textqu">
  		{query.modifiedResponse 
    		? renderDiff(query.response, query.modifiedResponse)
    		: "No modified response provided"}
		</p>              
		</div>

              <div className="button-groupqu">
                <button className="confirm-btnqu" onClick={() => handleStatusChange(query.questionId, "accept")}>
                  Confirm
                </button>
                <button className="reject-btnqu" onClick={() => handleStatusChange(query.questionId, "reject")}>
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar />
    </>
  );
};

export default ReviewQueries;
