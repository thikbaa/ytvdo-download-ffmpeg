import express from "express";
const app = express();
import ytdl from "ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
const __dirname = path.resolve();
import cors from "cors";
import fs from "fs";
import streamBuffers from "stream-buffers";
import ufs from "url-file-size";
import sanitizeFilename from "sanitize-filename";
import contentDisposition from "content-disposition";
import axios from "axios";
// import ffmpegPath from "ffmpeg-static";
import cp from "child_process";
import stream from "stream";

const ffmpegPath = path.join(__dirname, "bin", "ffmpeg-static/ffmpeg"); // Adjust the path accordingly
ffmpeg.setFfmpegPath(ffmpegPath);

// Serve static files
app.use(express.static(path.resolve(__dirname, "public")));
app.use(cors());
// Endpoint to get video stream

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

    // Get video info

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

//Hello bhai ji

// const ytmixer = (link, itag, options = {}) => {
//   const result = new stream.PassThrough({
//     highWaterMark: options.highWaterMark || 1024 * 512,
//   });
//   ytdl
//     .getInfo(link, options)
//     .then((info) => {
//       // Find the format with the specified itag
//       const videoFormat = info.formats.find((format) => format.itag === itag);

//       if (!videoFormat) {
//         throw new Error("No such format found");
//       }

//       // Download audio and video streams based on the selected itag
//       let audioStream = ytdl.downloadFromInfo(info, {
//         ...options,
//         quality: "highestaudio",
//       });

//       let videoStream = ytdl.downloadFromInfo(info, {
//         ...options,
//         format: videoFormat,
//       });

//       // Create the ffmpeg process for muxing
//       let ffmpegProcess = cp.spawn(
//         ffmpegPath,
//         [
//           // Supress non-crucial messages
//           "-loglevel",
//           "8",
//           "-hide_banner",
//           // Input audio and video by pipe
//           "-i",
//           "pipe:3",
//           "-i",
//           "pipe:4",
//           // Map audio and video correspondingly
//           "-map",
//           "0:a",
//           "-map",
//           "1:v",
//           // No need to change the codec
//           "-c",
//           "copy",
//           // Output mp4 and pipe
//           "-f",
//           "matroska",
//           "pipe:5",
//         ],
//         {
//           // No popup window for Windows users
//           windowsHide: true,
//           stdio: [
//             // Silence stdin/out, forward stderr
//             "inherit",
//             "inherit",
//             "inherit",
//             // And pipe audio, video, output
//             "pipe",
//             "pipe",
//             "pipe",
//           ],
//         }
//       );

//       audioStream.pipe(ffmpegProcess.stdio[3]);
//       videoStream.pipe(ffmpegProcess.stdio[4]);
//       ffmpegProcess.stdio[5].pipe(result);
//     })
//     .catch((error) => {
//       console.error(error);
//       result.emit("error", error);
//     });
//   return result;
// };
// // ----------

// // const ytmixer = (link, itag, options = {}) => {
// //   const result = new stream.PassThrough({
// //     highWaterMark: options.highWaterMark || 1024 * 512,
// //   });

// //   let totalSize = 0;

// //   ytdl
// //     .getInfo(link, options)
// //     .then((info) => {
// //       const videoFormat = info.formats.find((format) => format.itag === itag);

// //       if (!videoFormat) {
// //         throw new Error("No such format found");
// //       }

// //       let audioStream = ytdl.downloadFromInfo(info, {
// //         ...options,
// //         quality: "highestaudio",
// //       });
// //       let videoStream = ytdl.downloadFromInfo(info, {
// //         ...options,
// //         format: videoFormat,
// //       });

// //       let ffmpegProcess = cp.spawn(
// //         ffmpegPath,
// //         [
// //           "-loglevel",
// //           "8",
// //           "-hide_banner",
// //           "-i",
// //           "pipe:3",
// //           "-i",
// //           "pipe:4",
// //           "-map",
// //           "0:a",
// //           "-map",
// //           "1:v",
// //           "-c",
// //           "copy",
// //           "-f",
// //           "matroska",
// //           "pipe:5",
// //         ],
// //         {
// //           windowsHide: true,
// //           stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"],
// //         }
// //       );

// //       audioStream.pipe(ffmpegProcess.stdio[3]);
// //       videoStream.pipe(ffmpegProcess.stdio[4]);

// //       ffmpegProcess.stdio[5].on("data", (chunk) => {
// //         totalSize += chunk.length;
// //       });

// //       ffmpegProcess.stdio[5].pipe(result);

// //       ffmpegProcess.on("close", () => {
// //         result.emit("size", totalSize);
// //       });
// //     })
// //     .catch((error) => {
// //       console.error(error);
// //       result.emit("error", error);
// //     });

// //   return {
// //     stream: result,
// //     getSize: () => totalSize,
// //   };
// // };

// // app.get("/download", async (req, res) => {
// //   try {
// //     const videoURL = req.query.url;
// //     const itag = parseInt(req.query.itag); // Convert itag to integer

// //     if (!videoURL || !itag) {
// //       return res.status(400).send("Video URL and itag are required");
// //     }

// //     const info = await ytdl.getInfo(videoURL);

// //     const format = info.formats.find(
// //       (format) => format.itag === parseInt(itag)
// //     );

// //     const videoStream = ytmixer(videoURL, itag);

// //     // Set Content-Disposition header to force download
// //     const sanitizedTitle = sanitizeFilename(info.videoDetails.title) || "video";

// //     const contentLength = parseInt(format.contentLength) || 0;

// //     // Use content-disposition to set the Content-Disposition header
// //     const disposition = contentDisposition(
// //       `${sanitizedTitle}.${format.container}`
// //     );
// //     res.setHeader("Content-Disposition", disposition);

// //     // }
// //     res.setHeader("Content-Length", videoStream.getSize());
// //     res.setHeader("Content-Type", `video/${format.container}`);
// //     console.log("videoStream.totalVdoSize ", videoStream.totalVdoSize);
// //     // Pipe the video stream to the response
// //     videoStream.stream.pipe(res);
// //     // res.json({sucess: true})
// //   } catch (error) {
// //     console.error(error);
// //     res.status(500).send("Internal Server Error");
// //   }
// // });

// app.get("/download", async (req, res) => {
//   try {
//     const videoURL = req.query.url;
//     const itag = parseInt(req.query.itag); // Convert itag to integer

//     if (!videoURL || !itag) {
//       return res.status(400).send("Video URL and itag are required");
//     }

//     const info = await ytdl.getInfo(videoURL);

//     const format = info.formats.find((format) => format.itag === itag);

//     let audioInfo = ytdl.chooseFormat(info.formats, {
//       quality: "highestaudio",
//     });

//     if (!format) {
//       return res.status(400).send("Invalid itag or format not found");
//     }

//     if (format.hasAudio) {
//       const sanitizedTitle =
//         sanitizeFilename(info.videoDetails.title) || "video";

//       const contentLength = parseInt(format.contentLength) || 0;

//       // Use content-disposition to set the Content-Disposition header
//       const disposition = contentDisposition(
//         `${sanitizedTitle}.${format.container}`
//       );
//       res.setHeader("Content-Disposition", disposition);
//       // res.setHeader('Content-Disposition', `attachment; filename="${info.videoDetails.title}.${format.container}"`);

//       if (contentLength !== 0) {
//         res.setHeader("Content-Length", contentLength);
//       } else {
//         let mylength = await ufs(format.url);
//         res.setHeader("Content-Length", mylength);
//       }
//       res.setHeader("Content-Type", `video/${format.container}`);
//       let myone = ytdl(videoURL, { format });

//       ytdl(videoURL, { format }).pipe(res);
//     } else {
//       // const videoStream = ytmixer(videoURL, itag);

//       // Buffer the video data
//       // const writableStreamBuffer = new streamBuffers.WritableStreamBuffer();
//       // videoStream.stream.pipe(writableStreamBuffer);

//       // videoStream.stream.on("end", () => {
//       //   const buffer = writableStreamBuffer.getContents();
//       //   if (buffer) {
//       //     const contentLength = buffer.length;
//       //     const sanitizedTitle =
//       //       sanitizeFilename(info.videoDetails.title) || "video";
//       //     const disposition = contentDisposition(
//       //       `${sanitizedTitle}.${format.container}`
//       //     );
//       //     console.log("contentLength hai yha  ", contentLength);
//       //     res.setHeader("X-Video-Duration", format.approxDurationMs);
//       //     res.setHeader("Content-Disposition", disposition);
//       //     res.setHeader("Content-Length", contentLength);
//       //     res.setHeader("Content-Type", `video/${format.container}`);
//       //     res.send(buffer);
//       //   } else {
//       //     res.status(500).send("Failed to buffer video data");
//       //   }
//       // });
//       // console.log(myFormat)

//       // const contentLength = buffer.length;
//       const sanitizedTitle =
//         sanitizeFilename(info.videoDetails.title) || "video";
//       const disposition = contentDisposition(
//         `${sanitizedTitle}.${format.container}`
//       );
//       let contentLengthInBytes = parseInt(format.contentLength) + parseInt(audioInfo.contentLength);
//       console.log("format.contentLength ", format.contentLength)
//       console.log("audioInfo.contentLength ", audioInfo.contentLength)
//       console.log("contentLengthInBytes ", contentLengthInBytes)
//       // Convert bytes to megabytes
//       const contentLengthInMB = Math.ceil(contentLengthInBytes / (1000 * 1000));

//       console.log("File size:", contentLengthInMB, "MB");
//       const videoStream = ytmixer(videoURL, itag);

//       // Set Content-Disposition header to force download
//       res.setHeader("Content-Disposition", disposition);

//       res.header("Content-Type", "video/mp4");
//       // res.header("Filename", sanitizedTitle);
//       res.setHeader("Content-Length", contentLengthInBytes);
//       console.log("sanitizedTitle ", sanitizedTitle)

//       // Pipe the video stream to the response
//       videoStream.pipe(res);

//       videoStream.on("error", (error) => {
//         console.error("Stream Error:", error);
//         res.status(500).send("<h1>Internal Server Error</h1>");
//       });
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("<h1>Internal Server Error</h1>");
//   }
// });

// const ytmixer = (link, itag, options = {}) => {
//   return new Promise((resolve, reject) => {
//     const result = new stream.PassThrough({
//       highWaterMark: options.highWaterMark || 1024 * 512,
//     });

//     ytdl
//       .getInfo(link, options)
//       .then((info) => {
//         const videoFormat = info.formats.find((format) => format.itag === itag);
//         if (!videoFormat) {
//           throw new Error("No such format found");
//         }

//         const audioFormat = ytdl.chooseFormat(info.formats, {
//           quality: "highestaudio",
//         });

//         let totalContentLength =
//           parseInt(videoFormat.contentLength) +
//           parseInt(audioFormat.contentLength);

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
//             "matroska",
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

//         resolve({ stream: result, contentLength: totalContentLength });
//       })
//       .catch(reject);
//   });
// };

// app.get("/download", async (req, res) => {
//   try {
//     const videoURL = req.query.url;
//     const itag = parseInt(req.query.itag);

//     if (!videoURL || !itag) {
//       return res.status(400).send("Video URL and itag are required");
//     }

//     const info = await ytdl.getInfo(videoURL);
//     const format = info.formats.find((format) => format.itag === itag);

//     if (!format) {
//       return res.status(400).send("Invalid itag or format not found");
//     }

//     const sanitizedTitle = sanitizeFilename(info.videoDetails.title) || "video";
//     const disposition = contentDisposition(
//       `${sanitizedTitle}.${format.container}`
//     );

//     res.setHeader("Content-Disposition", disposition);
//     res.setHeader("Content-Type", `video/${format.container}`);

//     if (format.hasAudio) {
//       const contentLength =
//         parseInt(format.contentLength) ||
//         (await ytdl.getURLVideoSize(format.url));
//       res.setHeader("Content-Length", contentLength);
//       ytdl(videoURL, { format }).pipe(res);
//     } else {
//       const { stream: videoStream, contentLength } = await ytmixer(
//         videoURL,
//         itag
//       );
//       res.setHeader("Content-Length", contentLength);
//       videoStream.pipe(res);
//     }

//     // Error handling for the stream
//     res.on("error", (error) => {
//       console.error("Response stream error:", error);
//       if (!res.headersSent) {
//         res.status(500).send("Internal Server Error");
//       }
//     });
//   } catch (error) {
//     console.error("Download error:", error);
//     if (!res.headersSent) {
//       res.status(500).send("Internal Server Error");
//     }
//   }
// });

// Function to get content length using HEAD request
// async function getContentLength(url) {
//   try {
//     const response = await axios.head(url);
//     return parseInt(response.headers["content-length"]);
//   } catch (error) {
//     console.error("Error getting content length:", error.message);
//     return null;
//   }
// }

const ytmixer = async (link, itag, options = {}) => {
  const info = await ytdl.getInfo(link, options);
  const videoFormat = info.formats.find((format) => format.itag === itag);

  if (!videoFormat) {
    throw new Error("No such format found");
  }

  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: "highestaudio",
  });

  // Get content lengths using HEAD requests
  // const videoContentLength = await getContentLength(videoFormat.url);
  // const audioContentLength = await getContentLength(audioFormat.url);
  //  const totalContentLength =
  //   (videoContentLength || 0) + (audioContentLength || 0);
  //   console.log("totalContentLength in use ", totalContentLength);
  let totalContentLength =
    parseInt(videoFormat.contentLength) + parseInt(audioFormat.contentLength);

  console.log("totalContentLength ", totalContentLength);

  const result = new stream.PassThrough({
    highWaterMark: options.highWaterMark || 1024 * 512,
  });

  let audioStream = ytdl.downloadFromInfo(info, {
    ...options,
    quality: "highestaudio",
  });
  let videoStream = ytdl.downloadFromInfo(info, {
    ...options,
    format: videoFormat,
  });

  let ffmpegProcess = cp.spawn(
    ffmpegPath,
    [
      "-loglevel",
      "8",
      "-hide_banner",
      "-i",
      "pipe:3",
      "-i",
      "pipe:4",
      "-map",
      "0:a",
      "-map",
      "1:v",
      "-c",
      "copy",
      "-f",
      "matroska",
      "pipe:5",
    ],
    {
      windowsHide: true,
      stdio: ["inherit", "inherit", "inherit", "pipe", "pipe", "pipe"],
    }
  );

  audioStream.pipe(ffmpegProcess.stdio[3]);
  videoStream.pipe(ffmpegProcess.stdio[4]);
  ffmpegProcess.stdio[5].pipe(result);

  return { stream: result, contentLength: totalContentLength };
};

app.get("/download", async (req, res) => {
  try {
    const videoURL = req.query.url;
    const itag = parseInt(req.query.itag);

    if (!videoURL || !itag) {
      return res.status(400).send("Video URL and itag are required");
    }

    const info = await ytdl.getInfo(videoURL);
    const format = info.formats.find((format) => format.itag === itag);

    if (!format) {
      return res.status(400).send("Invalid itag or format not found");
    }

    const sanitizedTitle = sanitizeFilename(info.videoDetails.title) || "video";
    const disposition = contentDisposition(
      `${sanitizedTitle}.${format.container}`
    );

    res.setHeader("Content-Disposition", disposition);
    res.setHeader("Content-Type", `video/${format.container}`);

    let contentLength;
    let downloadStream;

    if (format.hasAudio) {
      contentLength = await getContentLength(format.url);
      downloadStream = ytdl(videoURL, { format });
    } else {
      const { stream, contentLength: mixerContentLength } = await ytmixer(
        videoURL,
        itag
      );
      contentLength = mixerContentLength;
      downloadStream = stream;
    }

    if (contentLength) {
      // res.setHeader("Content-Length", contentLength);
      res.header("contentLength", contentLength);
    }

    downloadStream.pipe(res);

    // Error handling for the stream
    downloadStream.on("error", (error) => {
      console.error("Download stream error:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    });

    res.on("error", (error) => {
      console.error("Response stream error:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    });
  } catch (error) {
    console.error("Download error:", error);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error");
    }
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
