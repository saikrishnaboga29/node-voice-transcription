import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import FormData from 'form-data';
import multer from 'multer';
import { AbortController } from 'abort-controller';

const app = express();
const port = process.env.PORT || 3000;

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

app.post('/proxy', upload.single('file'), async (req, res) => {
    console.log('Received a request on /proxy');
    
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded' });
    }

    const file = req.file;
    console.log('File received:', file);

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

        const controller = new AbortController();
        const timeout = setTimeout(() => {
            controller.abort();
        }, 30000); // Set timeout to 30 seconds

        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Received response from Cloudflare API:', data);

        if (!response.ok) {
            console.error('Error response from Cloudflare API:', response.statusText);
            return res.status(response.status).send({ message: data.message || response.statusText });
        }

        res.status(200).send({
            transcription: data.result ? data.result.text : 'No transcription available.',
            ...data
        });
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out');
            res.status(504).send({ message: 'Request timed out' });
        } else {
            console.error('Error while making request to Cloudflare API:', error.message);
            res.status(500).send({ message: error.message });
        }
    }
});

app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
});
