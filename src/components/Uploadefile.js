"use client";
import { useState, useRef } from 'react';

export default function UploadFile() {
  // Initialize states to hold multiple files for both job and resume
  const [jobFiles, setJobFiles] = useState([]);
  const [resumeFiles, setResumeFiles] = useState([]);

  const jobInputRef = useRef();
  const resumeInputRef = useRef();

  // Handle multiple job files selection
  const handleJobFilesChange = (e) => {
    setJobFiles(Array.from(e.target.files)); // Convert FileList to an array
  };

  // Handle multiple resume files selection
  const handleResumeFilesChange = (e) => {
    setResumeFiles(Array.from(e.target.files)); // Convert FileList to an array
  };

  const handleUpload = async () => {
    if (jobFiles.length === 0 && resumeFiles.length === 0) {
      alert('Please upload at least one file.');
      return;
    }

    const formData = new FormData();
    // Append all selected job files
    jobFiles.forEach((file) => formData.append('jobFile', file));
    // Append all selected resume files
    resumeFiles.forEach((file) => formData.append('resumeFile', file));

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        alert('Uploaded Successfully');
        setJobFiles([]);  // Clear the job files state
        setResumeFiles([]); // Clear the resume files state
        if (jobInputRef.current) jobInputRef.current.value = "";
        if (resumeInputRef.current) resumeInputRef.current.value = "";
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Upload failed. Server may be down.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div>
        <h3>1. Upload Job Files (Multiple allowed)</h3>
        <input
          type="file"
          ref={jobInputRef}
          onChange={handleJobFilesChange}
          multiple // Allow multiple files
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>2. Upload Resumes (Multiple allowed)</h3>
        <input
          type="file"
          ref={resumeInputRef}
          onChange={handleResumeFilesChange}
          multiple // Allow multiple files
        />
      </div>

      <button onClick={handleUpload} style={{ marginTop: '1.5rem' }}>
        Submit Your Files
      </button>
    </div>
  );
}
