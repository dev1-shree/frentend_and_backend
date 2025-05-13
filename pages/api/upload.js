import { google } from 'googleapis';
import formidable from 'formidable';
import { Readable } from 'stream';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const keyB64 = process.env.GOOGLE_SERVICE_ACCOUNT_B64;
  if (!keyB64) return res.status(500).json({ error: 'Missing GOOGLE_SERVICE_ACCOUNT_B64' });

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8'));
  } catch (err) {
    return res.status(500).json({ error: 'Failed to decode service account' });
  }

  const form = formidable({ keepExtensions: true, multiples: true });

 form.parse(req, async (err, fields, files) => {
  if (err) return res.status(500).json({ error: 'Form parsing failed' });

  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const uploaded = [];

  const uploadBufferFile = async (file, folderId) => {
    const buffer = await fs.promises.readFile(file.filepath); 
    const stream = Readable.from(buffer);

    const response = await drive.files.create({
      requestBody: {
        name: file.originalFilename,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: stream,
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
    // ✅ Replace this part
    const uploadedJobFiles = files.jobFile
      ? Array.isArray(files.jobFile)
        ? files.jobFile
        : [files.jobFile]
      : [];

    const uploadedResumeFiles = files.resumeFile
      ? Array.isArray(files.resumeFile)
        ? files.resumeFile
        : [files.resumeFile]
      : [];

    for (let jobFile of uploadedJobFiles) {
      uploaded.push(await uploadBufferFile(jobFile, process.env.GOOGLE_DRIVE_FOLDER_JOB));
    }

    for (let resumeFile of uploadedResumeFiles) {
      uploaded.push(await uploadBufferFile(resumeFile, process.env.GOOGLE_DRIVE_FOLDER_RESUME));
    }

    res.status(200).json({ uploaded });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

}
