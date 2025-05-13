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

    const keyPath = path.join(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS);
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
      const imageFiles = Array.isArray(files.imageFile) ? files.imageFile : [files.imageFile];

      for (let imageFile of imageFiles) {
        const uploadedImage = await uploadFile(imageFile, process.env.GOOGLE_DRIVE_FOLDER_IMAGES);
        uploaded.push({ ...uploadedImage, type: 'imageFile_imageFolder' });
      }

      res.status(200).json({ uploaded });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
