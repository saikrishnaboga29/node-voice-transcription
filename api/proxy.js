import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import FormData from 'form-data';
import multer from 'multer';

const app = express();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

app.post('/api/proxy', upload.single('file'), async (req, res) => {
    console.log('Received a request on /api/proxy');
    
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded' });
    }
    
    const file = req.file;
    console.log('File:', file);
    
    const url = 'https://api.cloudflare.com/client/v4/accounts/efb0ac3a4fb32de98af9abed9246efa6/ai/run/@cf/openai/whisper';
    const token = '9MlLEHQGYWmpQLN-mHiEn9-WLKphbaK-mi00NQC1';

    const formData = new FormData();
    formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
    });
    console.log('FormData prepared');

    const options = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            ...formData.getHeaders()
        },
        body: formData,
    };

    try {
        console.log('Sending request to Cloudflare API');
        const response = await fetch(url, options);
        const data = await response.json();
        console.log('Received response from Cloudflare API:', data);

        res.status(response.status).send({
            transcription: data.result.text || 'No transcription available.',
            ...data
        });
    } catch (error) {
        console.error('Error while making request to Cloudflare API:', error.message);
        res.status(500).send({ message: error.message });
    }
});

export default app;
