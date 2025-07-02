import React, { useState, useEffect } from "react";
import axios from "axios";
import { Table, Input, message, Button, Modal, Select } from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import adduser from "../Assets/addIcon.png";
import download from "../Assets/downloadIcon.png";
import regenerate from "../Assets/regenerateIcon.png";
import "../Styles/RfpListTable.css";
import FileUpload from "./FileUpload";
import search from "../Assets/searchIcon.png";
import logger from "../utils/logger";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const RfpSearch = ({ userId, token }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [rfpData, setRfpData] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedRfpId, setSelectedRfpId] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  const showToast = (msg, type = "success") => {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => document.body.removeChild(toast), 500);
    }, 3000);
  };

  const handleUploadModal = () => setUploadModalVisible(true);
  const handleCancelUpload = () => setUploadModalVisible(false);

  const fetchRfpData = async (query = "") => {
    try {
      logger.debug("Fetching RFP data for query:", query);
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/RFP/search`, {
        params: { userId, query },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        const mapped = response.data.map((item) => ({
          id: item.rfpid || "N/A",
          name: item.rfpname || "N/A",
          lastUpdated: item.lastUpdated
            ? dayjs(item.lastUpdated).format("DD-MM-YYYY hh:mm A")
            : "N/A",
          uploadedBy: item.uploadedBy || "N/A",
          version: item.version || "N/A",
        }));
        logger.debug("RFP records received:", mapped);
        setRfpData(mapped);
      } else {
        message.error("No results found.");
      }
    } catch (error) {
      logger.error("Error fetching RFPs:", error);
      message.error("Failed to fetch RFP data.");
    }
  };

  useEffect(() => {
    fetchRfpData(searchQuery);
  }, [userId, token, searchQuery]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (Array.isArray(response.data)) {
        const filteredUsers = response.data.filter(
          (user) => user.id !== parseInt(userId, 10)
        );
        logger.debug("Fetched assignable users:", filteredUsers);
        setUsers(filteredUsers);
      } else {
        message.error("Failed to fetch users.");
      }
    } catch (error) {
      logger.error("Error fetching users:", error);
      message.error("Failed to fetch users.");
    }
  };

  const openModal = (rfpId) => {
    setSelectedRfpId(rfpId);
    logger.debug("Opening modal to assign RFP:", rfpId);
    fetchUsers();
    setModalVisible(true);
  };

  const addUserToRfp = async () => {
    if (!selectedUser || !selectedRfpId) {
      message.error("Please select a user.");
      return;
    }
    const requestBody = {
      addedByuserId: Number(userId),
      addeduserId: Number(selectedUser),
      RFPId: Number(selectedRfpId),
    };
    logger.info("Assigning RFP:", requestBody);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/RFP/assignRFP`,
        requestBody,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      toast.success(`User assigned successfully to RFP ID ${selectedRfpId}`);
      logger.info("RFP assignment response:", response.data);
      setModalVisible(false);
      setSelectedUser(null);
    } catch (error) {
      logger.error("Error assigning RFP:", error);
      message.error(error.response ? error.response.data : "Failed to add user.");
    }
  };

  const downloadFile = async (id) => {
    try {
      logger.info("Downloading RFP:", id);
      const response = await axios.get(`${process.env.REACT_APP_BASE_URL}/RFP/download/${id}`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `RFP_${id}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("Download started!");
    } catch (error) {
      logger.error("Error downloading RFP:", error);
      message.error("Failed to download file.");
    }
  };

  const handleRegenerateResponse = async (record) => {
    logger.info("Regenerating response for:", record);
    setIsGenerating(true);
    try {
      const username = localStorage.getItem("userName") || "Unknown User";
      const userId = localStorage.getItem("userId") || "1";

      const fileResponse = await fetch(`${process.env.REACT_APP_BASE_URL}/RFP/getFile/${record.id}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!fileResponse.ok) throw new Error("Failed to fetch RFP file");

      const fileBlob = await fileResponse.blob();
      const file = new File([fileBlob], `${record.name}.xlsx`, { type: fileBlob.type });
      const formData = new FormData();
      formData.append("rfp_name", record.name);
      formData.append("uploaded_by", username);
      formData.append("file", file);
      formData.append("user_id", userId);

      const uploadResponse = await fetch(`${process.env.REACT_APP_PY_MODEL_URL}/upload_rfp/`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error("Failed to upload RFP");

      const uploadData = await uploadResponse.json();
      showToast(`File reprocessed successfully! (Version ${uploadData.version})`);

      if (!uploadData.rfpid) throw new Error("RFP ID not received");

      await downloadFile(uploadData.rfpid);
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      logger.error("Regeneration failed:", error);
      showToast(error.message || "Error regenerating RFP", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: "35%",
      sorter: (a, b) => a.name.localeCompare(b.name),
      onHeaderCell: () => ({ className: "table-header-rfpse" }),
    },
    {
      title: "Last Updated & Version",
      key: "lastUpdatedVersion",
      width: "25%",
      sorter: (a, b) =>
        dayjs(b.lastUpdated, "DD-MM-YYYY hh:mm A").valueOf() -
        dayjs(a.lastUpdated, "DD-MM-YYYY hh:mm A").valueOf(),
      onHeaderCell: () => ({ className: "table-header-rfpse" }),
      render: (_, record) => (
        <>
          <div>{record.lastUpdated}</div>
          <div style={{ fontSize: "12px", color: "gray" }}>Version: {record.version}</div>
        </>
      ),
    },
    {
      title: "Uploaded By",
      dataIndex: "uploadedBy",
      key: "uploadedBy",
      width: "20%",
      onHeaderCell: () => ({ className: "table-header-rfpse" }),
    },
    {
      title: "Action",
      key: "action",
      width: "20%",
      onHeaderCell: () => ({ className: "table-header-rfpse" }),
      render: (_, record) => (
        <div className="button-container-rfpse">
          <Button type="link" onClick={() => openModal(record.id)}>
            <img className="add-user-icon-rfpse" src={adduser} alt="Add user" />
          </Button>
          <Button type="link" onClick={() => handleRegenerateResponse(record)} disabled={isGenerating}>
            <img className="gene-icon-rfpse" src={regenerate} alt="Regenerate Response" />
          </Button>
          <Button type="link" onClick={() => downloadFile(record.id)}>
            <img className="download-icon-rfpse" src={download} alt="Download" />
          </Button>
          {isGenerating && (
            <div className="overlay">
              <div className="loader"></div><br />
              <p><strong>Regenerating... Please wait.</strong></p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="rfp-list-container-rfpse">
      <div className="rfp-list-title-container">
        <div className="search-upload-container">
          <h2 className="rfp-list-title-rfpse">RFP List</h2>
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input-rfpse"
            prefix={<img src={search} alt="Search" className="search-icon-rfpse" />}
          />
          <Button className="upload-button" onClick={handleUploadModal}>Upload a new RFP</Button>
          <Modal open={uploadModalVisible} onCancel={handleCancelUpload} footer={null} width={800}>
            <FileUpload onCancel={handleCancelUpload} />
          </Modal>
        </div>
      </div>

      <div className="rfp-table">
        <Table pagination={{ pageSize: 5 }} dataSource={rfpData} columns={columns} rowKey="id" className="rfp-table-rfpse" />
      </div>

      <Modal
        title="Select User to Add"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>Close</Button>,
          <Button key="add" type="primary" onClick={addUserToRfp} disabled={!selectedUser}>Add</Button>,
        ]}
      >
        <Select
          className="user-select-rfpse"
          placeholder="Add User"
          onChange={(value) => setSelectedUser(value)}
          value={selectedUser || undefined}
        >
          {users.length === 0 ? (
            <Select.Option disabled>No users available</Select.Option>
          ) : (
            users.map((user) => (
              <Select.Option key={user.id} value={user.id}>
                {user.id} - {user.username}
              </Select.Option>
            ))
          )}
        </Select>
      </Modal>
    </div>
  );
};

export default RfpSearch;
