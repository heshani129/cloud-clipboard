import React, { useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import './App.css';

// Local development API base URL (Change IP if testing on mobile phone over same Wi-Fi)
const API_BASE = 'http://localhost:5000/api';

function App() {
  const [activeTab, setActiveTab] = useState('send'); // 'send' or 'receive'
  const [textInput, setTextInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [generatedPin, setGeneratedPin] = useState('');
  const [inputPin, setInputPin] = useState('');
  const [retrievedText, setRetrievedText] = useState('');
  const [status, setStatus] = useState('');

  // Handle Text or File Uploads (Send Mode)
  const handleUpload = async (type) => {
    const formData = new FormData();
    formData.append('type', type);

    if (type === 'text') {
      if (!textInput.trim()) return setStatus('Please enter text before sharing.');
      formData.append('textContent', textInput);
    } else {
      if (!selectedFile) return setStatus('Please select a file to upload.');
      formData.append('file', selectedFile);
    }

    try {
      setStatus('Uploading payload...');
      const response = await axios.post(`${API_BASE}/upload`, formData);
      setGeneratedPin(response.data.pin);
      setStatus('Success! Valid for 10 minutes.');
    } catch (err) {
      console.error(err);
      setStatus('Upload failed. Ensure backend server is running.');
    }
  };

  // Handle Payload Retrieval (Receive Mode)
  const handleRetrieve = async () => {
    if (inputPin.length !== 6) return setStatus('Please enter a valid 6-digit PIN.');
    setStatus('Retrieving content...');
    setRetrievedText('');

    try {
      const response = await axios.get(`${API_BASE}/retrieve/${inputPin}`);

      if (response.data.type === 'text') {
        setRetrievedText(response.data.data);
        setStatus('Text content retrieved successfully!');
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setStatus('Invalid, expired, or already consumed PIN.');
      } else {
        // If the endpoint returns binary stream (File), trigger direct download link
        window.open(`${API_BASE}/retrieve/${inputPin}`, '_blank');
        setStatus('File download initiated.');
      }
    }
  };

  // Helper to copy retrieved text to laptop clipboard
  const handleCopyText = () => {
    navigator.clipboard.writeText(retrievedText);
    setStatus('Text copied to clipboard!');
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Cloud Clipboard</h1>
        <p>Ephemeral document & text transfer across devices</p>
      </header>

      {/* Tab Switcher */}
      <div className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => { setActiveTab('send'); setStatus(''); }}
        >
          Send (Phone)
        </button>
        <button
          className={`tab-btn ${activeTab === 'receive' ? 'active' : ''}`}
          onClick={() => { setActiveTab('receive'); setStatus(''); }}
        >
          Receive (Laptop)
        </button>
      </div>

      {/* TAB 1: SEND PAYLOAD */}
      {activeTab === 'send' && (
        <div className="card">
          <h3>Option A: Share Text / Link</h3>
          <textarea
            className="input-textarea"
            rows="4"
            placeholder="Paste text, notes, or URL here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
          />
          <button className="primary-btn" onClick={() => handleUpload('text')}>
            Generate PIN for Text
          </button>

          <hr className="divider" />

          <h3>Option B: Share Document / File</h3>
          <input
            type="file"
            className="file-input"
            onChange={(e) => setSelectedFile(e.target.files[0])}
          />
          <button className="primary-btn" onClick={() => handleUpload('file')}>
            Upload File
          </button>

          {/* Generated PIN & QR Output Display */}
          {generatedPin && (
            <div className="pin-display">
              <p>Your Transfer PIN (Expires in 10 mins):</p>
              <h2 className="pin-code">{generatedPin}</h2>
              <div className="qr-box">
                <QRCodeSVG value={generatedPin} size={140} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RECEIVE PAYLOAD */}
      {activeTab === 'receive' && (
        <div className="card">
          <h3>Retrieve Content</h3>
          <p className="subtitle">Enter the 6-digit PIN displayed on your mobile device:</p>

          <div className="pin-input-group">
            <input
              type="text"
              maxLength="6"
              className="pin-input"
              placeholder="123456"
              value={inputPin}
              onChange={(e) => setInputPin(e.target.value)}
            />
            <button className="primary-btn" onClick={handleRetrieve}>
              Fetch
            </button>
          </div>

          {/* Retrieved Text Box */}
          {retrievedText && (
            <div className="retrieved-box">
              <h4>Received Text:</h4>
              <textarea
                readOnly
                className="input-textarea"
                rows="5"
                value={retrievedText}
              />
              <button className="secondary-btn" onClick={handleCopyText}>
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Notifications */}
      {status && <div className="status-banner">{status}</div>}
    </div>
  );
}

export default App;