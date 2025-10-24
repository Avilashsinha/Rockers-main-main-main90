import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { addNote } from './store.js';

cloudinary.config({
  cloud_name: "dwm9m3dwk",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  return new Promise((resolve) => {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        res.status(400).json({ error: err.message });
        return resolve();
      }

      try {
        const { title, subject, desc } = req.body;

        if (!req.file || !title) {
          res.status(400).json({ error: "File and title are required" });
          return resolve();
        }

        // ✅ Force all uploads (including PDFs) as 'image' type so they open inline
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "campusnotes/notes",
              resource_type: "image", // ✅ forces Cloudinary to treat PDF as previewable
              public_id: `${Date.now()}_${req.file.originalname.split(".")[0]}`,
              use_filename: true,
              unique_filename: false,
              overwrite: false,
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
          subject: subject?.trim() || "",
          desc: desc?.trim() || "",
          type: "note",
          fileName: req.file.originalname,
          fileUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
          createdAt: new Date(),
        };

        addNote(note);

        res.status(201).json({
          message: "✅ File uploaded successfully!",
          file: note,
        });

        return resolve();
      } catch (error) {
        console.error("Upload failed:", error);
        res.status(500).json({ error: "Upload failed: " + error.message });
        return resolve();
      }
    });
  });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
