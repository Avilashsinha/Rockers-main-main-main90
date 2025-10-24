import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { getNotes, addNote } from '../store.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json(getNotes());
  }

  if (req.method === 'POST') {
    return new Promise((resolve) => {
      upload.single('file')(req, res, async (err) => {
        if (err) {
          res.status(400).json({ error: err.message });
          resolve();
          return;
        }

        try {
          const { title, subject, desc, type } = req.body;

          if (!req.file || !title) {
            res.status(400).json({ error: "File and title required" });
            resolve();
            return;
          }

          const resourceType = type === 'image' ? 'image' : 'raw';

          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                resource_type: resourceType,
                folder: `campusnotes/${type}s`,
                public_id: `${Date.now()}_${req.file.originalname.split('.')[0]}`,
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            );
            uploadStream.end(req.file.buffer);
          });

          const note = {
            id: Date.now().toString(),
            title: title.trim(),
            subject: subject?.trim() || '',
            desc: desc?.trim() || '',
            type,
            fileName: req.file.originalname,
            fileUrl: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
            createdAt: new Date()
          };

          addNote(note);

          res.status(201).json({
            message: "File uploaded successfully!",
            file: {
              id: note.id,
              title: note.title,
              fileName: note.fileName,
              fileUrl: note.fileUrl,
              type: note.type
            }
          });
          resolve();
        } catch (error) {
          res.status(500).json({ error: "Upload failed: " + error.message });
          resolve();
        }
      });
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export const config = {
  api: {
    bodyParser: false,
  },
};