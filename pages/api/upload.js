import { google } from 'googleapis';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  // 🔐 Decode service account key
  const keyPath = path.join(process.cwd(), 'service_account.json');
  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;

  if (!keyB64) return res.status(500).json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT_B64' });

  try {
    fs.writeFileSync(keyPath, Buffer.from(keyB64, 'base64').toString('utf-8'));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to decode service account' });
  }

  const uploadDir = path.join(process.cwd(), '/uploads');
  fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({
    keepExtensions: true,
    uploadDir,
    multiples: true,
  });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Form parsing failed.' });

    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const uploaded = [];

    const uploadFile = async (file, folderId) => {
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

      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: { role: 'reader', type: 'anyone' },
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

      if (jobFile) {
        uploaded.push(await uploadFile(jobFile, process.env.GOOGLE_DRIVE_FOLDER_JOB));
      }

      if (resumeFile) {
        uploaded.push(await uploadFile(resumeFile, process.env.GOOGLE_DRIVE_FOLDER_RESUME));
      }

      res.status(200).json({ uploaded });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
