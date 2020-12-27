// @format
require("dotenv").config();

const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");

const logger = require("./logger.js");
const { createConnection } = require("./icecast.js");

const {
  NODE_ENV,
  WEBCAST_PORT,
  ICECAST_PROTOCOL,
  ICECAST_HOST,
  ICECAST_PORT,
  ICECAST_USER,
  ICECAST_PASS,
  ICECAST_MOUNT,
  CERT_PATH,
  ENCODING_MIME
} = process.env;

const STREAM = {
  PUBLIC: true,
  NAME: "WASM-STREAM",
  DESCRIPTION: "A STREAM FROM THE rc3 world",
  URL: "https://audio.daubenschuetz.de/stream",
  MIME: ENCODING_MIME
};

let certOptions;

if (NODE_ENV === "production") {
  certOptions = {
    cert: `${CERT_PATH}fullchain.pem`,
    key: `${CERT_PATH}privkey.pem`
  };
} else {
  certOptions = {
    cert: "./fullchain.pem",
    key: "./privkey.pem"
  };
}

// Implementation of Webcast Specification: https://github.com/webcast/webcast.js/blob/master/SPECS.md
const server = http.createServer({});

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

        conn = createConnection(
          ICECAST_HOST,
          ICECAST_PORT,
          ICECAST_MOUNT,
          ICECAST_USER,
          ICECAST_PASS,
          STREAM.MIME,
          STREAM.PUBLIC,
          STREAM.NAME,
          STREAM.DESCRIPTION,
          STREAM.URL,
          bitrate,
          samplerate,
          channels
        );

        conn.on("error", err => {
          if (err.message.includes(`with status "403"`)) {
            console.log("Another stream still in progress, couldn't connect");
          }
          logger.info(
            `Creating a connection with icecast wasn't possible: "${err.toString()}"`
          );
          ws.send("error");
          ws.close();
        });

        conn.on("close", () => {
          logger.info("Icecast closed connection");
          ws.send("icecast closed connection");
          ws.close();
        });

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
