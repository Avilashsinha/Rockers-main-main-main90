import { v2 as cloudinary } from "cloudinary";
import { deleteNote, findNote } from '../store.js';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { id } = req.query;

    if (req.method === 'DELETE') {
        try {
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

            // Remove the note from storage
            deleteNote(id);
            res.status(200).json({ message: "File deleted successfully!" });
        } catch (error) {
            console.error("Delete error:", error);
            res.status(500).json({ error: "Delete failed: " + error.message });
        }
    } else {
        res.status(405).json({ error: "Method not allowed" });
    }
}