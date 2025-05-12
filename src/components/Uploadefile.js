    "use client";
    import { useState, useRef } from 'react';

    export default function UploadeFile() {
    const [jobFile, setJobFile] = useState(null);
    const [resumeFile, setResumeFile] = useState(null);
    
    const jobInputRef = useRef();
    const resumeInputRef = useRef();

    const handleUpload = async () => {
        if (!jobFile && !resumeFile) {
        alert('Please upload at least one file.');
        return;
        }

        const formData = new FormData();
        if (jobFile) formData.append('jobFile', jobFile);
        if (resumeFile) formData.append('resumeFile', resumeFile);

        try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();
        if (res.ok) {
                alert(' Uploaded Successfully');
            setJobFile(null);
            setResumeFile(null);
            if (jobInputRef.current) jobInputRef.current.value = "";
            if (resumeInputRef.current) resumeInputRef.current.value = "";
        } else {
            alert(` Error: ${data.error}`);
        }
        } catch (err) {
        alert(' Upload failed. Server may be down.');
        }
    };

    return (
        <div style={{ padding: '2rem' }}>
        <div>
            <h3>1. Upload Job</h3>
            <input
            type="file"
            ref={jobInputRef}
            onChange={e => setJobFile(e.target.files[0])}
            />
        </div>

        <div style={{ marginTop: '1rem' }}>
            <h3>2. Upload Resumes</h3>
            <input
            type="file"
            ref={resumeInputRef}
            onChange={e => setResumeFile(e.target.files[0])}
            />
        </div>

        <button onClick={handleUpload} style={{ marginTop: '1.5rem' }}>
            Submit Your File
        </button>
        </div>
    );
    }
