import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const uploadDir = path.join(process.cwd(), '/uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    keepExtensions: true,
    uploadDir: uploadDir,
    multiples: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'File parsing failed.' });
    }

    const keyPath = path.join(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_BASE64);
    if (!fs.existsSync(keyPath)) {
      return res.status(500).json({ error: 'Service account key not found' });
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const uploaded = [];

    const uploadFile = async (file, folderId) => {
      if (!file || !file.filepath) {
        throw new Error('File path is undefined');
      }

      const response = await drive.files.create({
        requestBody: {
          name: file.originalFilename,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.filepath),
        },
        fields: 'id, name, webViewLink, webContentLink',
      });

      // Make public
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        viewLink: response.data.webViewLink,
        downloadLink: response.data.webContentLink,
      };
    };

    try {
      const jobFile = Array.isArray(files.jobFile) ? files.jobFile[0] : files.jobFile;
      const resumeFile = Array.isArray(files.resumeFile) ? files.resumeFile[0] : files.resumeFile;

      const isJobUploaded = !!jobFile;
      const isResumeUploaded = !!resumeFile;

      // 1. Only job file → upload to Job folder
      if (isJobUploaded && !isResumeUploaded) {
        const uploadedJob = await uploadFile(jobFile, process.env.GOOGLE_DRIVE_FOLDER_JOB);
        uploaded.push({ ...uploadedJob, type: 'jobFile_jobFolder' });
      }

      // 2. Only resume file → upload to Resume folder
      if (!isJobUploaded && isResumeUploaded) {
        const uploadedResume = await uploadFile(resumeFile, process.env.GOOGLE_DRIVE_FOLDER_RESUME);
        uploaded.push({ ...uploadedResume, type: 'resumeFile_resumeFolder' });
      }

      // 3. Both files → upload both to both folders
      if (isJobUploaded && isResumeUploaded) {
        const uploadedJob1 = await uploadFile(jobFile, process.env.GOOGLE_DRIVE_FOLDER_JOB);
        uploaded.push({ ...uploadedJob1, type: 'jobFile_jobFolder' });

        const uploadedJob2 = await uploadFile(jobFile, process.env.GOOGLE_DRIVE_FOLDER_RESUME);
        uploaded.push({ ...uploadedJob2, type: 'jobFile_resumeFolder' });

        const uploadedResume1 = await uploadFile(resumeFile, process.env.GOOGLE_DRIVE_FOLDER_JOB);
        uploaded.push({ ...uploadedResume1, type: 'resumeFile_jobFolder' });

        const uploadedResume2 = await uploadFile(resumeFile, process.env.GOOGLE_DRIVE_FOLDER_RESUME);
        uploaded.push({ ...uploadedResume2, type: 'resumeFile_resumeFolder' });
      }
      res.status(200).json({ uploaded });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
