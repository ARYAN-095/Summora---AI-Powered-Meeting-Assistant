const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = 3001;

// --- Middleware ---
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// --- File Storage Configuration (using Multer for temporary storage) ---
const upload = multer({ dest: 'temp_uploads/' });
// Ensure the temp directory exists
fs.existsSync('temp_uploads/') || fs.mkdirSync('temp_uploads/');


// --- API Routes ---
app.post('/api/upload', upload.single('recording'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    console.log('File received from frontend. Forwarding to Python AI service...');

    const pythonServiceUrl = 'http://localhost:5000/process-video';
    const filePath = req.file.path;

    try {
        // Create a form and append the file stream
        const form = new FormData();
        form.append('recording', fs.createReadStream(filePath), req.file.originalname);

        // Post the form to the Python service
        const response = await axios.post(pythonServiceUrl, form, {
            headers: {
                ...form.getHeaders()
            }
        });

        console.log('Successfully forwarded file to Python service.');
        // Send the response from the Python service back to our frontend
        res.status(200).json(response.data);

    } catch (error) {
        console.error('Error forwarding file to Python service:', error.message);
        res.status(500).json({ message: 'Error communicating with AI service.' });
    } finally {
        // Clean up the temporary file
        fs.unlinkSync(filePath);
    }
});


// --- Start the Server ---
app.listen(port, () => {
    console.log(`Node.js gateway server running on http://localhost:${port}`);
    console.log('This server will forward requests to the Python service on port 5000.');
});
