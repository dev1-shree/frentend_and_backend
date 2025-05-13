"use client";
import { useState, useRef } from 'react';

export default function UploadeFile() {
  const [jobFiles, setJobFiles] = useState([]);
  const [resumeFiles, setResumeFiles] = useState([]);
  const jobInputRef = useRef();
  const resumeInputRef = useRef();

  const handleUpload = async () => {
    if (jobFiles.length === 0 && resumeFiles.length === 0) {
      alert('Please upload at least one file.');
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
        alert('Uploaded Successfully!');
        setJobFiles([]);
        setResumeFiles([]);
        if (jobInputRef.current) jobInputRef.current.value = "";
        if (resumeInputRef.current) resumeInputRef.current.value = "";
        console.log("Uploaded:", data.uploaded);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Upload failed. Server may be down.');
      console.error(err);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div>
        <h3>1. Upload Job Files</h3>
        <input
          type="file"
          ref={jobInputRef}
          onChange={(e) => setJobFiles(Array.from(e.target.files))}
          multiple
        />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <h3>2. Upload Resume Files</h3>
        <input
          type="file"
          ref={resumeInputRef}
          onChange={(e) => setResumeFiles(Array.from(e.target.files))}
          multiple
        />
      </div>

      <button onClick={handleUpload} style={{ marginTop: '1.5rem' }}>
        Submit Files
      </button>
    </div>
  );
}
