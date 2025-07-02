// import React from "react";
// import { Route, BrowserRouter as Router, Routes, Navigate } from "react-router-dom";
// import FileUpload from "./components/FileUpload";
// import LandingPage from "./components/LandingPage";
// import Login from "./components/Login";
// import EnrichResponse from "./components/EnrichResponse";
// import Response from "./components/Response.js";
// import { SearchProvider } from "./components/SearchContext";
// import ReviewQueries1 from "./components/ReviewQueries1";
// import AskQueryPage from "./components/AskQueryPage.js";

// function PrivateRoute({ element, adminOnly = false }) {
//   const isAuthenticated = !!localStorage.getItem("token");
//   const userRole = localStorage.getItem("role");
//   if (!isAuthenticated) return <Navigate to="/" />;

//   if (adminOnly && userRole !== "ADMIN") return <Navigate to="/landing" />;

//   return element;
// }

// function App() {
//   return (
//     <SearchProvider>
//       <Router>
//         <Routes>
//           <Route path="/" element={<Login />} />
//           <Route
//             path="/landing"
//             element={
//               localStorage.getItem("role") === "ADMIN" ? (
//                 <Navigate to="/review-queries" />
//               ) : (
//                 <PrivateRoute element={<LandingPage />} />
//               )
//             }
//           />

//           <Route path="/search" element={<PrivateRoute element={<AskQueryPage />} />} />
//           <Route path="/upload" element={<PrivateRoute element={<FileUpload />} />} />
//           <Route path="/review-queries" element={<PrivateRoute element={<ReviewQueries1 />} adminOnly />} />
//           <Route path="/enrich" element={<PrivateRoute element={<EnrichResponse />} />} />
//           <Route path="/response" element={<PrivateRoute element={<Response />} />} />
//         </Routes>
//       </Router>
//     </SearchProvider>
//   );
// }


// export default App;


import React from "react";
import { Route, BrowserRouter as Router, Routes, Navigate } from "react-router-dom";
import FileUpload from "./components/FileUpload";
import LandingPage from "./components/LandingPage";
import Login from "./components/Login";
import EnrichResponse from "./components/EnrichResponse";
import Response from "./components/Response.js";
import { SearchProvider } from "./components/SearchContext";
import ReviewQueries from "./components/AdminReviewQueries.js"
import AskQueryPage from "./components/AskQueryPage.js";

function PrivateRoute({ element, adminOnly = false }) {
  const isAuthenticated = !!localStorage.getItem("token");
  const userRole = localStorage.getItem("role");

  if (!isAuthenticated) return <Navigate to="/" />;
  if (adminOnly && userRole !== "ADMIN") return <Navigate to="/landing" />;

  return element;
}

// 🔹 Separate component to handle role-based redirection safely
function LandingRedirect() {
  const userRole = localStorage.getItem("role");
  return userRole === "ADMIN" ? <Navigate to="/review-queries" /> : <LandingPage />;
}

function App() {
  return (
    <SearchProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/landing" element={<PrivateRoute element={<LandingRedirect />} />} />
          <Route path="/search" element={<PrivateRoute element={<AskQueryPage />} />} />
          <Route path="/upload" element={<PrivateRoute element={<FileUpload />} />} />
          <Route path="/review-queries" element={<PrivateRoute element={<ReviewQueries />} adminOnly />} />
          <Route path="/enrich" element={<PrivateRoute element={<EnrichResponse />} />} />
          <Route path="/response" element={<PrivateRoute element={<Response />} />} />
        </Routes>
      </Router>
    </SearchProvider>
  );
}

export default App;
