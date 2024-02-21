import express from "express"
const app = express();
import ytdl from "ytdl-core";
import ffmpeg from 'fluent-ffmpeg'
// import ffmpegPath from '@ffmpeg-installer/ffmpeg'
import path from "path"
const __dirname = path.resolve();
// import fs from "fs"
// import tmp from 'tmp';

import ffmpegPath from 'ffmpeg-static';
import cp from 'child_process';
import stream from 'stream';

// Set the path to the FFmpeg binary
ffmpeg.setFfmpegPath(ffmpegPath);

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


//Hello bhai ji

const ytmixer = (link, itag, options = {}) => {
    const result = new stream.PassThrough({ highWaterMark: (options).highWaterMark || 1024 * 512 });
    ytdl.getInfo(link, options).then(info => {
        // Find the format with the specified itag
        const videoFormat = info.formats.find(format => format.itag === itag);

        if (!videoFormat) {
            throw new Error('No such format found');
        }

        // Download audio and video streams based on the selected itag
        let audioStream = ytdl.downloadFromInfo(info, { ...options, quality: 'highestaudio' });
        let videoStream = ytdl.downloadFromInfo(info, { ...options, format: videoFormat });

        // Create the ffmpeg process for muxing
        let ffmpegProcess = cp.spawn(ffmpegPath, [
            // Supress non-crucial messages
            '-loglevel', '8', '-hide_banner',
            // Input audio and video by pipe
            '-i', 'pipe:3', '-i', 'pipe:4',
            // Map audio and video correspondingly
            '-map', '0:a', '-map', '1:v',
            // No need to change the codec
            '-c', 'copy',
            // Output mp4 and pipe
            '-f', 'matroska', 'pipe:5'
        ], {
            // No popup window for Windows users
            windowsHide: true,
            stdio: [
                // Silence stdin/out, forward stderr
                'inherit', 'inherit', 'inherit',
                // And pipe audio, video, output
                'pipe', 'pipe', 'pipe'
            ]
        });

        audioStream.pipe(ffmpegProcess.stdio[3]);
        videoStream.pipe(ffmpegProcess.stdio[4]);
        ffmpegProcess.stdio[5].pipe(result);
    }).catch(error => {
        console.error(error);
        result.emit('error', error);
    });
    return result;
};

app.get('/download', async (req, res) => {
    try {
        const videoURL = req.query.url;
        const itag = parseInt(req.query.itag); // Convert itag to integer

        if (!videoURL || !itag) {
            return res.status(400).send('Video URL and itag are required');
        }

        const info = await ytdl.getInfo(videoURL);
        const sanitizedTitle = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_'); // Replace invalid characters with underscores
        const myFormat = info.formats.filter((format) => {
            return format.itag === itag
        });

        // console.log(myFormat)
        let contentLengthInBytes = myFormat[0].contentLength;
        // Convert bytes to megabytes
        const contentLengthInMB = Math.ceil(contentLengthInBytes / (1000 * 1000));

        console.log('File size:', contentLengthInMB, 'MB');
        const videoStream = ytmixer(videoURL, itag);

        // Set Content-Disposition header to force download
        res.header('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        // Pipe the video stream to the response
        videoStream.pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


app.get('/download-alraudio', async (req, res) => {
    try {
        const videoURL = req.query.url;
        const itag = req.query.itag;

        if (!videoURL || !itag) {
            return res.status(400).send('Video URL and itag are required');
        }

        // Get video stream
        const videoStream = ytdl(videoURL, { filter: format => format.itag === parseInt(itag) });

        const info = await ytdl.getInfo(videoURL);
        const sanitizedTitle = info.videoDetails.title.replace(/[^a-z0-9]/gi, '_'); // Replace invalid characters with underscores
       

        // Set response headers

        res.header('Content-Disposition', `attachment; filename="${sanitizedTitle}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        // Pipe video stream to response
        videoStream.pipe(res);

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
