import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 5000;

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dwm9m3dwk",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ✅ Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// ✅ Middleware
app.use(express.json());
app.use(express.static('.'));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ✅ Path to JSON data file
const DATA_FILE = path.join(__dirname, 'api', 'notes-data.json');

// Ensure the data directory exists
if (!fs.existsSync(path.join(__dirname, 'api'))) {
  fs.mkdirSync(path.join(__dirname, 'api'));
}

// Utility functions for local JSON storage
function getNotes() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Error reading notes-data.json:', err);
    return [];
  }
}

function saveNotes(notes) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing notes-data.json:', err);
  }
}

// ✅ Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get all notes
app.get('/api/notes', (req, res) => {
  res.json(getNotes());
});

// Alias for /api/notes
app.get('/api/data', (req, res) => {
  res.json(getNotes());
});

// ✅ Upload route
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, subject, desc, type } = req.body;
    if (!req.file || !title) {
      return res.status(400).json({ error: 'File and title are required' });
    }

    const resourceType = type === 'image' ? 'image' : 'raw';

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: `campusnotes/${type || 'notes'}`,
          public_id: `${Date.now()}_${req.file.originalname.split('.')[0]}`
        },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      uploadStream.end(req.file.buffer);
    });

    // Create note object
    const note = {
      id: Date.now().toString(),
      title: title.trim(),
      subject: subject?.trim() || '',
      desc: desc?.trim() || '',
      type: type || 'note',
      fileName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      createdAt: new Date()
    };

    // Save to JSON
    const notes = getNotes();
    notes.push(note);
    saveNotes(notes);

    res.status(201).json({ message: '✅ File uploaded successfully!', file: note });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

// ✅ Delete note
app.delete('/api/data/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const notes = getNotes();
    const note = notes.find(n => n.id === id);

    if (!note) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete from Cloudinary if exists
    if (note.publicId) {
      try {
        const resourceType = note.type === 'image' ? 'image' : 'raw';
        await cloudinary.uploader.destroy(note.publicId, { resource_type: resourceType });
      } catch (err) {
        console.error('Cloudinary delete error:', err);
      }
    }

    const updatedNotes = notes.filter(n => n.id !== id);
    saveNotes(updatedNotes);
    res.json({ message: '✅ File deleted successfully!' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed: ' + error.message });
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║            🚀 CampusNotes Development Server              ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${port}                 ║
║  API endpoints:                                            ║
║    - GET  /api/health                                      ║
║    - GET  /api/notes                                       ║
║    - GET  /api/data                                        ║
║    - POST /api/upload                                      ║
║    - DELETE /api/data/:id                                  ║
║                                                            ║
║  💾 Data saved to: api/notes-data.json                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});
