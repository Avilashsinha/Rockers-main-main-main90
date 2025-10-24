import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getNotes, addNote, deleteNote, findNote } from './api/store.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dwm9m3dwk",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Middleware
app.use(express.json());
app.use(express.static('.'));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CampusNotes API is running' });
});

// Get all notes
app.get('/api/notes', (req, res) => {
  try {
    const notes = getNotes();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

// Upload route
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, subject, desc, type } = req.body;
    if (!req.file || !title) return res.status(400).json({ error: "File and title are required" });

    const resourceType = type === 'image' ? 'image' : 'raw';
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: `campusnotes/${type || 'files'}` },
        (err, result) => (err ? reject(err) : resolve(result))
      );
      stream.end(req.file.buffer);
    });

    const note = {
      id: Date.now().toString(),
      title: title.trim(),
      subject: subject?.trim() || '',
      desc: desc?.trim() || '',
      type: type || 'note',
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      createdAt: new Date().toISOString(),
    };

    addNote(note);
    res.status(201).json({ message: '✅ File uploaded successfully!', note });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// Delete
app.delete('/api/data/:id', async (req, res) => {
  try {
    const note = findNote(req.params.id);
    if (!note) return res.status(404).json({ error: 'Note not found' });

    await cloudinary.uploader.destroy(note.publicId, {
      resource_type: note.type === 'image' ? 'image' : 'raw',
    });

    deleteNote(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

app.listen(port, () => console.log(`🚀 Server running on http://localhost:${port}`));
