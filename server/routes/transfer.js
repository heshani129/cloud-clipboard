const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const redisClient = require('../config/redis');

// Storage configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB limit

// Helper function to generate a 6-digit numeric PIN
const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

// Route 1: Upload Text or File
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        const { type, textContent } = req.body;
        const pin = generatePin();
        const payload = {};

        if (type === 'text') {
            payload.type = 'text';
            payload.data = textContent;
        } else if (type === 'file' && req.file) {
            payload.type = 'file';
            payload.originalName = req.file.originalname;
            payload.filePath = req.file.path;
            payload.mimeType = req.file.mimetype;
        } else {
            return res.status(400).json({ error: 'Invalid payload provided.' });
        }

        // Save payload to Redis with 600-second (10 min) TTL
        await redisClient.setEx(`transfer:${pin}`, 600, JSON.stringify(payload));

        return res.status(200).json({ success: true, pin, expiresInSeconds: 600 });
    } catch (err) {
        return res.status(500).json({ error: 'Upload failed: ' + err.message });
    }
});

// Route 2: Retrieve Content by 6-digit PIN
router.get('/retrieve/:pin', async (req, res) => {
    try {
        const { pin } = req.params;
        const rawData = await redisClient.get(`transfer:${pin}`);

        if (!rawData) {
            return res.status(404).json({ error: 'PIN invalid or expired.' });
        }

        const payload = JSON.parse(rawData);

        if (payload.type === 'text') {
            // Burn-on-read: Delete key immediately after fetching
            await redisClient.del(`transfer:${pin}`);
            return res.status(200).json({ type: 'text', data: payload.data });
        } else if (payload.type === 'file') {
            res.download(payload.filePath, payload.originalName, async (err) => {
                if (!err) {
                    // Cleanup disk file and Redis key after download finishes
                    if (fs.existsSync(payload.filePath)) fs.unlinkSync(payload.filePath);
                    await redisClient.del(`transfer:${pin}`);
                }
            });
        }
    } catch (err) {
        return res.status(500).json({ error: 'Retrieval failed: ' + err.message });
    }
});

module.exports = router;