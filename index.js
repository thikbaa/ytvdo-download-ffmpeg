// Server-side code using Node.js with Express
import express from "express"
const app = express();
import ytdl from "ytdl-core";
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'

// Serve static files
app.use(express.static('public'));

// Serve static files
app.use(express.static('public'));

// Endpoint to get video stream
app.get('/video', async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!videoURL) {
            return res.status(400).send('Video URL is required');
        }

        // Get video info
        const info = await ytdl.getInfo(videoURL);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestvideo' });

        if (!format) {
            return res.status(404).send('No video format found');
        }

        // Sanitize video title for filename
        const fileName = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove non-word characters

        // Pipe video stream to response
        res.header('Content-Disposition', `attachment; filename="${fileName}.mp4"`);
        ytdl(videoURL, { format: format })
            .on('error', err => {
                console.error(err);
                res.status(500).send('Error streaming video');
            })
            .pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/video-info', async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!videoURL) {
            return res.status(400).send('Video URL is required');
        }

        // Get video info
        const info = await ytdl.getInfo(videoURL);
        res.json(info.formats);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint to download video
app.get('/download', async (req, res) => {
    try {
        const videoURL = req.query.url;
        const itag = req.query.itag;

        if (!videoURL || !itag) {
            return res.status(400).send('Video URL and itag are required');
        }

        // Get video and audio streams
        const videoStream = ytdl(videoURL, { filter: format => format.itag === parseInt(itag) });
        const audioStream = ytdl(videoURL, { filter: format => format.itag === 140 }); // Select audio format

        // Initialize ffmpeg
let path =         ffmpegPath.path;
        ffmpeg.setFfmpegPath(path);

        // Merge video and audio streams
        const mergedStream = ffmpeg()
        .input(videoStream)
        .input(audioStream)
        .outputOptions('-c:v libx264') // H.264 video codec
        .outputOptions('-c:a aac')      // AAC audio codec
        .format('mp4')
        .pipe();

        // Set response headers
        res.header('Content-Disposition', `attachment; filename="video_with_audio.mp4"`);
        res.header('Content-Type', 'video/mp4');

        // Pipe merged stream to response
        mergedStream.pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
