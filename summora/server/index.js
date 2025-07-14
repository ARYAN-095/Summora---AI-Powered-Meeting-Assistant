const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3001;

// --- Middleware ---
// Enable CORS for our frontend to communicate with this server
app.use(cors({ origin: 'http://localhost:3000' })); 
// Middleware to parse JSON bodies (though not used for file upload, it's good practice)
app.use(express.json());

// --- File Storage Configuration (using Multer) ---
const uploadDir = 'uploads';
// Ensure the upload directory exists
fs.existsSync(uploadDir) || fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Save files to the 'uploads' directory
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.webm');
    }
});

const upload = multer({ storage: storage });

// --- API Routes ---
app.post('/api/upload', upload.single('recording'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    
    console.log('File uploaded successfully:', req.file.path);
    
    // In a future sprint, we'll trigger the transcription service here.
    // For now, we just confirm the upload was successful.
    res.status(200).json({ 
        message: 'File uploaded successfully!',
        filePath: req.file.path 
    });
});

// --- Start the Server ---
app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
});
