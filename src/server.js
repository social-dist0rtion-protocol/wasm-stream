// @format
require("dotenv").config();

const WebSocket = require("ws");
const http = require("http");
const fs = require("fs");

const Shine = require("./vendor/libshine.js");

const { genWavNoise } = require("./utils.js");
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
  MIME: ENCODING_MIME,
  BITRATE: 32,
  SAMPLE_RATE: 44100,
  CHANNELS: 1
};

const shine = new Shine({
  samplerate: STREAM.SAMPLE_RATE,
  bitrate: STREAM.BITRATE,
  channels: STREAM.CHANNELS,
  mode: Shine.MONO
});

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
let streamBuf = new Uint8Array();

async function startStreaming() {
  conn = await createConnection(
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
    STREAM.BITRATE,
    STREAM.SAMPLE_RATE,
    STREAM.CHANNELS
  );

  let buf = new Uint8Array();
  let totalBitsSent = 0;
  let start = process.hrtime.bigint();
  let bufSizeBits = 0;
  let diffSec = 0;
  while (true) {
    if (!conn) break;

    if (
      totalBitsSent < diffSec * STREAM.BITRATE * 1000 &&
      bufSizeBits < STREAM.BITRATE * 1000
    ) {
      // We fill up the stream with noise
      logger.info("Noisefillup active");
      let noise = shine.encode([genWavNoise()]);
      if (noise.length === 0) continue;
      let newStreamBuf = new Uint8Array(streamBuf.length + noise.length);
      newStreamBuf.set(streamBuf);
      newStreamBuf.set(noise, streamBuf.length);
      streamBuf = newStreamBuf;
    }

    let newBuf = new Uint8Array(buf.length + streamBuf.length);
    newBuf.set(buf);
    newBuf.set(streamBuf, buf.length);
    buf = newBuf;
    streamBuf = new Uint8Array();

    bufSizeBits = buf.length * buf.BYTES_PER_ELEMENT * 8;
    const currTime = process.hrtime.bigint();
    diffSec = Number(currTime - start) / 1000000000;

    if (
      bufSizeBits > STREAM.BITRATE * 1000 &&
      totalBitsSent < diffSec * STREAM.BITRATE * 1000
    ) {
      const toSend = buf.subarray(0, STREAM.BITRATE * 1000);

      buf = buf.subarray(STREAM.BITRATE * 1000, buf.length);

      totalBitsSent += toSend.length * toSend.BYTES_PER_ELEMENT * 8;
      conn.write(toSend);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }
  logger.info("broke loop because connection lost");

  conn.on("error", async err => {
    conn = null;
    logger.error(`Waiting 5 seconds before reconnecting: ${err.toString()}`);
    new Promise(resolve => setTimeout(resolve, 5000));
    return startStreaming();
  });

  conn.on("close", () => {
    conn = null;
    logger.error(`Waiting 5 seconds before reconnecting`);
    new Promise(resolve => setTimeout(resolve, 5000));
    return startStreaming();
  });
}

wss.on("connection", ws => {
  ws.on("close", () => {
    logger.info("WebSocket connection closed");
    helloFrameReceived = false;
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
        logger.info("Received hello frame, broadcasting to icecast now");
        helloFrameReceived = true;
        streamBuf = new Uint8Array();
        return;
      }
    }

    if (conn) {
      const msgBuf = new Uint8Array(msg);
      let newBuf = new Uint8Array(streamBuf.length + msgBuf.length);
      newBuf.set(streamBuf);
      newBuf.set(msgBuf, streamBuf.length);
      streamBuf = newBuf;
    }
  });
});

server.listen(8080);
startStreaming();
