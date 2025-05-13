"use client";
import { useState, useRef } from 'react';

export default function UploadFile() {
  const [imageFiles, setImageFiles] = useState([]);
  const [jobFiles, setJobFiles] = useState([]);
  const [resumeFiles, setResumeFiles] = useState([]);

  const imageInputRef = useRef();
  const jobInputRef = useRef();
  const resumeInputRef = useRef();

  const handleImageFilesChange = (e) => {
    setImageFiles(Array.from(e.target.files)); 
  };

  const handleJobFilesChange = (e) => {
    setJobFiles(Array.from(e.target.files)); 
  };

  const handleResumeFilesChange = (e) => {
    setResumeFiles(Array.from(e.target.files)); 
  };

const handleUpload = async () => {
  if (jobFiles.length === 0 && resumeFiles.length === 0) {
    alert('Please upload at least one job or resume file.');
    return;
  }

  const formData = new FormData();
  jobFiles.forEach((file) => formData.append('jobFile', file));
  resumeFiles.forEach((file) => formData.append('resumeFile', file));

  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      alert('Uploaded Successfully');
      setJobFiles([]);
      setResumeFiles([]);
      setImageFiles([]);
      if (jobInputRef.current) jobInputRef.current.value = "";
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      if (imageInputRef.current) imageInputRef.current.value = "";
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
          multiple
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>2. Upload Resumes (Multiple allowed)</h3>
        <input
          type="file"
          ref={resumeInputRef}
          onChange={handleResumeFilesChange}
          multiple
        />
      </div>

      <button onClick={handleUpload} style={{ marginTop: '1.5rem' }}>
        Submit Your Files
      </button>
    </div>
  );
}
