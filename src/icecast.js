// @format
const http = require("http");

const logger = require("./logger.js");

// Implementation of: Icecast Specification:
// https://gist.github.com/ePirat/adc3b8ba00d85b7e3870

function basicAuth(username, password) {
  return Buffer.from(`${username}:${password}`, "utf-8").toString("base64");
}

async function createConnection(
  hostname,
  port,
  mount,
  user,
  pass,
  contentType,
  pub,
  name,
  desc,
  url,
  bitrate,
  sampleRate,
  channels
) {
  const auth = `Basic ${basicAuth(user, pass)}`;

  pub = pub ? "1" : "0";

  logger.info("Trying to connect to icecast for starting stream");
  return new Promise((resolve, reject) => {
    let connection = http.request(
      {
        host: hostname,
        port,
        path: mount,
        method: "PUT",
        headers: {
          Authorization: auth,
          "Transfer-Encoding": "chunked",
          "Content-Type": contentType,
          "Ice-Public": pub,
          "Ice-Name": name,
          "Ice-Description": desc,
          "Ice-URL": url,
          "Ice-Bitrate": bitrate,
          "ice-audio-info": `samplerate=${sampleRate};channels=${channels}`,
          Expect: "100-continue"
        }
      },
      res => {
        logger.info(`STATUS FROM SERVER: ${res.statusCode}`);
        res.setEncoding("utf8");

        if (res.statusCode !== 200) {
          reject(
            new Error(
              `Icecast server responded with status "${res.statusCode}"`
            )
          );
        } else {
          resolve(connection);
          logger.info("Stream successfully mounted with status 200");
        }
      }
    );
  });
}

module.exports = {
  createConnection
};
