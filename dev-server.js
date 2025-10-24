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
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Middleware
app.use(express.json());
app.use(express.static('.'));

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        message: 'CampusNotes API is running'
    });
});

// Get all notes
app.get('/api/notes', (req, res) => {
    try {
        const notes = getNotes();
        res.json(notes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// Get all data (alias for /api/notes)
app.get('/api/data', (req, res) => {
    try {
        const notes = getNotes();
        res.json(notes);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

// Upload note
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const { title, subject, desc, type } = req.body;

        if (!req.file || !title) {
            return res.status(400).json({ error: "File and title are required" });
        }

        // Determine resource type for Cloudinary
        const resourceType = type === 'image' ? 'image' : 'raw';

        // Upload to Cloudinary
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

        // Save to persistent storage
        addNote(note);

        res.status(201).json({
            message: "✅ File uploaded successfully!",
            file: note
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: "Upload failed: " + error.message });
    }
});

// Delete note
app.delete('/api/data/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: "Note ID is required" });
        }

        const note = findNote(id);
        if (!note) {
            return res.status(404).json({ error: "File not found" });
        }

        // Delete from Cloudinary if it has a public ID
        if (note.publicId) {
            try {
                const resourceType = note.type === 'image' ? 'image' : 'raw';
                await cloudinary.uploader.destroy(note.publicId, { resource_type: resourceType });
            } catch (cloudinaryError) {
                console.error("Cloudinary delete error:", cloudinaryError);
                // Continue with deletion even if Cloudinary fails
            }
        }

        // Remove from persistent storage
        deleteNote(id);
        res.status(200).json({ message: "File deleted successfully!" });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: "Delete failed: " + error.message });
    }
});

// Start server
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
║  📝 Persistent storage enabled                            ║
║  💾 Data saved to: api/notes-data.json                    ║
╚════════════════════════════════════════════════════════════╝
  `);
});
