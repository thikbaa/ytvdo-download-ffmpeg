import express from "express";
const app = express();
import ytdl from "@distube/ytdl-core";
// import ytdl from "ytdl-core";
import path from "path";
const __dirname = path.resolve();
import cors from "cors";
import ufs from "url-file-size";
import sanitizeFilename from "sanitize-filename";
import contentDisposition from "content-disposition";
import axios from "axios";
// import ffmpegPath from "ffmpeg-static";
// import cp from "child_process";
// import stream from "stream";

// const httpServer = createServer(app);
// const io = new Server(httpServer, {
//   cors: {
//     origin: "http://localhost:5173", // Replace with your client's URL
//     methods: ["GET", "POST"]
//   }
// });

// enable socket.io
// const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:5173", // Adjust according to your client URL
//     methods: ["GET", "POST"],
//   },
// });

// io.on('connection', (socket) => {
//   const clientId = socket.handshake.query.clientId;
//   socket.join(clientId);
//   console.log('New client connected:', clientId);

//   socket.on('disconnect', () => {
//     console.log('Client disconnected:', clientId);
//   });
// });

// const ffmpegPath = path.join(__dirname, "bin", "ffmpeg-static/ffmpeg"); // Adjust the path accordingly
// ffmpeg.setFfmpegPath(ffmpegPath);

// Serve static files
app.use(express.static(path.resolve(__dirname, "public")));
app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Be more specific in production
  res.header(
    "Access-Control-Expose-Headers",
    "X-Error-Message, X-Success-Message, Content-Disposition, Content-Type, Content-Length, Available-Formats"
  );
  next();
});

app.get("/video", async (req, res) => {
  try {
    const videoURL = req.query.url;
    if (!videoURL) {
      return res.status(400).send("Video URL is required");
    }

    // Get video info
    const info = await ytdl.getInfo(videoURL);
    const format = ytdl.chooseFormat(info.formats, { quality: "highestvideo" });

    if (!format) {
      return res.status(404).send("No video format found");
    }

    // Sanitize video title for filename
    const fileName = info.videoDetails.title.replace(/[^\w\s]/gi, ""); // Remove non-word characters

    // Pipe video stream to response
    res.header("Content-Disposition", `attachment; filename="${fileName}.mp4"`);
    ytdl(videoURL, { format: format })
      .on("error", (err) => {
        console.error(err);
        res.status(500).send("Error streaming video");
      })
      .pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/video-info", async (req, res) => {
  try {
    const videoURL = req.query.url;
    if (!videoURL) {
      return res.status(400).send("Video URL is required");
    }

    const info = await ytdl.getInfo(videoURL);

    const audioFormat = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
    });
    res.json({ formats: info.formats, audioLength: audioFormat.contentLength });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

// Function to get content length using HEAD request
async function getContentLength(url) {
  try {
    const response = await axios.head(url);
    return parseInt(response.headers["content-length"]);
  } catch (error) {
    console.error("Error getting content length:", error.message);
    return null;
  }
}

// const ytmixer = (link, itag, options = {}) => {
//   console.log("i am from ytmixer");
//   return new Promise((resolve, reject) => {
//     const result = new stream.PassThrough({
//       highWaterMark: options.highWaterMark || 1024 * 512,
//     });

//     ytdl
//       .getInfo(link, options)
//       .then((info) => {
//         const videoFormat = info.formats.find((format) => format.itag === itag);
//         console.log(
//           "i am from and ytmixer videoFormat",
//           videoFormat ? "ava" : "not"
//         );
//         if (!videoFormat) {
//           throw new Error("No such format found");
//         }

//         const audioFormat = ytdl.chooseFormat(info.formats, {
//           quality: "highestaudio",
//         });
//         console.log(
//           "i am from and ytmixer audioFormat",
//           audioFormat ? "ava" : "not"
//         );

//         let totalContentLength =
//           parseInt(videoFormat.contentLength || 0) +
//           parseInt(audioFormat.contentLength || 0);

//         let audioStream = ytdl.downloadFromInfo(info, {
//           ...options,
//           quality: "highestaudio",
//         });
//         let videoStream = ytdl.downloadFromInfo(info, {
//           ...options,
//           format: videoFormat,
//         });

//         let ffmpegProcess = cp.spawn(
//           ffmpegPath,
//           [
//             "-loglevel",
//             "8",
//             "-hide_banner",
//             "-i",
//             "pipe:3",
//             "-i",
//             "pipe:4",
//             "-map",
//             "0:a",
//             "-map",
//             "1:v",
//             "-c",
//             "copy",
//             "-f",
//             "mp4", // Change to mp4 format
//             "-movflags",
//             "frag_keyframe+empty_moov", // Add this line
//             "pipe:5",
//           ],
//           {
//             windowsHide: true,
//             stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"],
//           }
//         );

//         audioStream.pipe(ffmpegProcess.stdio[3]);
//         videoStream.pipe(ffmpegProcess.stdio[4]);
//         ffmpegProcess.stdio[5].pipe(result);
//         console.log("going to returm from ytmixer");
//         resolve({ stream: result, contentLength: totalContentLength });
//       })
//       .catch(reject);
//   });
// };

// with socket.io
function improvedFormatMapping(info) {
  let touseFormat = info.formats.filter((item) => item.hasVideo);
  const formatGroups = { mp4: {}, webm: {} };
  const formatMapping = { mp4: {}, webm: {} };

  touseFormat.forEach((format) => {
    if (format.container === "mp4" || format.container === "webm") {
      let qualityLabel = format.qualityLabel.replace("p60", "p");
      if (!formatGroups[format.container][qualityLabel]) {
        formatGroups[format.container][qualityLabel] = [];
      }
      formatGroups[format.container][qualityLabel].push(format);
    }
  });

  Object.keys(formatGroups).forEach((container) => {
    Object.keys(formatGroups[container]).forEach((label) => {
      const formats = formatGroups[container][label];
      formats.sort((a, b) => b.fps - a.fps || b.bitrate - a.bitrate);

      if (formats.length > 1 && formats[0].fps > formats[1].fps) {
        formatMapping[container][`${label}60`] = formats[0].itag;
        formatMapping[container][label] = formats[1].itag;
      } else if (formats.length > 1 && label !== "144p" && label !== "240p") {
        formatMapping[container][`${label}High`] = formats[0].itag;
        formatMapping[container][label] = formats[1].itag;
      } else {
        formatMapping[container][label] = formats[0].itag;
      }
    });
  });

  return formatMapping;
}

function getQualityScore(format) {
  const qualityMap = {
    144: 1,
    240: 2,
    360: 3,
    480: 4,
    720: 5,
    1080: 6,
    1440: 7,
    2160: 8,
  };
  const resolution = parseInt(format.qualityLabel);
  const resolutionScore = qualityMap[resolution] || 0;
  const fpsScore = format.fps > 30 ? 0.5 : 0;
  return resolutionScore + fpsScore;
}

function selectFormat(formats, targetItag, qualityPreference = "medium") {
  // First, try to find the exact requested format
  const exactFormat = formats.find((f) => f.itag === targetItag);
  if (exactFormat) return exactFormat;

  // Filter formats with video
  const videoFormats = formats.filter((f) => f.hasVideo);

  // Sort formats by quality score
  const sortedFormats = videoFormats.sort(
    (a, b) => getQualityScore(b) - getQualityScore(a)
  );

  // Select format based on quality preference
  switch (qualityPreference) {
    case "lowest":
      return sortedFormats[sortedFormats.length - 1];
    case "highest":
      return sortedFormats[0];
    case "medium":
    default:
      return sortedFormats[Math.floor(sortedFormats.length / 2)];
  }
}

app.get("/download", async (req, res) => {
  // const clientId = req.query.clientId; // You'll need to send this from the client

  try {
    const videoURL = req.query.url;
    const itag = parseInt(req.query.itag);
    const qualityPreference = req.query.quality || "medium"; // 'lowest', 'medium', 'highest'

    if (!videoURL || !itag) {
      res.setHeader("X-Error-Message", "Video URL and Quality are required!");
      return res
        .status(400)
        .json({ success: false, message: "Video URL and itag are required" });
    }

    const info = await ytdl.getInfo(videoURL);
    const availableFormats = improvedFormatMapping(info);
    res.setHeader("Available-Formats", JSON.stringify(availableFormats));

    let format = selectFormat(info.formats, itag, qualityPreference);

    if (!format) {
      res.setHeader("X-Error-Message", "No suitable format found");
      return res
        .status(400)
        .json({ success: false, message: "No suitable format found" });
    }

    res.setHeader(
      "X-Selected-Format",
      JSON.stringify({
        itag: format.itag,
        qualityLabel: format.qualityLabel,
        container: format.container,
      })
    );

    console.log("Available formats:", JSON.stringify(availableFormats));
    console.log("Selected format:", format.itag, format.qualityLabel);

    const sanitizedTitle = sanitizeFilename(info.videoDetails.title) || "video";
    const disposition = contentDisposition(
      `${sanitizedTitle}.${format.container}`
    );

    res.setHeader("Content-Disposition", disposition);
    res.setHeader("Content-Type", `video/${format.container}`);
    res.setHeader("X-Success-Message", "Download started successfully");

    let contentLength;
    let downloadStream;

    if (format.hasAudio) {
      contentLength = await getContentLength(format.url);
      if (contentLength !== 0) {
        res.setHeader("Content-Length", contentLength);
      } else {
        let mylength = await ufs(format.url);
        res.setHeader("Content-Length", mylength);
      }
      downloadStream = ytdl(videoURL, { format });
    } else {
      res.setHeader("X-Error-Message", "Internal Server Error");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }

    // if (contentLength) {
    //   res.setHeader("Content-Length", contentLength);
    // }

    downloadStream.pipe(res);

    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      if (!res.headersSent) {
        res.setHeader(
          "X-Error-Message",
          "Internal Server Error during download"
        );
        res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }
      // io.to(clientId).emit("downloadError", {
      //   message: "Error during download",
      // });
    });

    downloadStream.on("end", () => {
      console.log("Download stream ended successfully");
      // io.to(clientId).emit("downloadComplete", {
      //   message: "Download completed successfully",
      // });
    });

    res.on("error", (error) => {
      console.error("Response stream error:", error);
      if (!res.headersSent) {
        res.setHeader(
          "X-Error-Message",
          "Internal Server Error during response"
        );
        res
          .status(500)
          .json({ success: false, message: "Internal Server Error" });
      }
      // io.to(clientId).emit("downloadError", {
      //   message: "Error during response",
      // });
    });

    res.on("finish", () => {
      console.log("Response finished successfully");
    });
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.setHeader("X-Error-Message", "Internal Server Error");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
    // io.to(clientId).emit("downloadError", { message: "Internal Server Error" });
  }
});

app.get("/download-allreadyaudio", async (req, res) => {
  const videoURL = req.query.url;
  const itag = req.query.itag;
  if (!videoURL || !itag) {
    return res
      .status(400)
      .json({ success: false, message: "Video URL and itag are required" });
  }

  try {
    const info = await ytdl.getInfo(videoURL);
    const format = info.formats.find(
      (format) => format.itag === parseInt(itag)
    );

    if (!format) {
      return res
        .status(404)
        .json({ success: false, message: "Video format not found" });
    }

    // Sanitize the video title
    const sanitizedTitle = sanitizeFilename(info.videoDetails.title) || "video";

    const contentLength = parseInt(format.contentLength) || 0;

    // Use content-disposition to set the Content-Disposition header
    const disposition = contentDisposition(
      `${sanitizedTitle}.${format.container}`
    );
    res.setHeader("Content-Disposition", disposition);
    // res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.${format.container}"`);

    if (contentLength !== 0) {
      res.setHeader("Content-Length", contentLength);
    } else {
      let mylength = await ufs(format.url);
      res.setHeader("Content-Length", mylength);
    }
    res.setHeader("Content-Type", `video/${format.container}`);
    let myone = ytdl(videoURL, { format });

    ytdl(videoURL, { format }).pipe(res);
  } catch (error) {
    console.error("Error downloading video:", error);
    res
      .status(500)
      .json({ success: false, message: "Error downloading video" });
  }
});

// console.log("FFmpeg Path:", ffmpegPath);

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
// const PORT = process.env.PORT || 5000;
// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
