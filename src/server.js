// @format
require("dotenv").config();

const WebSocket = require("ws");
const https = require("http");
const fs = require("fs");

const logger = require("./logger.js");
const { createConnection } = require("./icecast.js");

const {
  WEBCAST_PORT,
  ICECAST_PROTOCOL,
  ICECAST_HOST,
  ICECAST_PORT,
  ICECAST_USER,
  ICECAST_PASS,
  ICECAST_MOUNT
} = process.env;

const STREAM = {
  PUBLIC: true,
  NAME: "WASM-STREAM",
  DESCRIPTION: "A STREAM FROM THE rc3 world",
  URL: "https://timdaub.github.io/wasm-synth"
};

// Implementation of Webcast Specification: https://github.com/webcast/webcast.js/blob/master/SPECS.md
const server = https.createServer({
  cert: fs.readFileSync('/etc/letsencrypt/live/audio.daubenschuetz.de/fullchain.pem'),
  key: fs.readFileSync('/etc/letsencrypt/live/audio.daubenschuetz.de/privkey.pem')
});

const wss = new WebSocket.Server({ server });
let helloFrameReceived = false;
let conn;

wss.on("connection", ws => {
  ws.on("close", () => {
    logger.info(
      "WebSocket connection closed, hence, closing icecast connection"
    );
    helloFrameReceived = false;
    conn.end();
    conn = null;
  });

  ws.on("message", async msg => {
    if (!helloFrameReceived) {
      let helloHead;
      try {
        helloHead = JSON.parse(msg);
      } catch (err) {
        if (!helloFrameReceived) {
          //logger.warn(`Error: Haven't received valid hello frame "${msg}"`);
        }
        return;
      }
      if (
        helloHead.type === "hello" &&
        helloHead.data &&
        helloHead.data.mime &&
        helloHead.data.audio &&
        helloHead.data.audio.samplerate &&
        helloHead.data.audio.bitrate &&
        helloHead.data.audio.channels
      ) {
        logger.info("Attempting to mount a stream on icecast server.");

        const {
          mime,
          audio: { samplerate, bitrate, channels }
        } = helloHead.data;

        try {
          conn = createConnection(
            ICECAST_HOST,
            ICECAST_PORT,
            ICECAST_MOUNT,
            ICECAST_USER,
            ICECAST_PASS,
            mime,
            STREAM.PUBLIC,
            STREAM.NAME,
            STREAM.DESCRIPTION,
            STREAM.URL,
            bitrate,
            samplerate,
            channels
          );
        } catch (err) {
          logger.info(
            `Creating a connection with icecast wasn't possible: "${err.toString()}"`
          );
          ws.send("error");
        }

        logger.info(
          "Successfully created connection to icecast server. Sending binary."
        );
        helloFrameReceived = true;
        return;
      }
    }

    if (conn) {
      // NOTE: Currently, we're only streaming mp3 encoded audio. For
      // web-compatible streaming, we need to encode to ogg-vorbis though.
      conn.write(msg);
    }
  });
});

server.listen(8080);
