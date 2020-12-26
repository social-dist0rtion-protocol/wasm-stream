// @format
require("dotenv").config();
const test = require("ava");
const { readFileSync } = require("fs");
const path = require("path");

test("if env and copy_env contain same values", t => {
  const envPath = path.resolve(`${__dirname}/../`, ".env");
  const copyPath = path.resolve(`${__dirname}/../`, ".env_copy");
  const envContent = readFileSync(envPath).toString();
  const copyContent = readFileSync(copyPath).toString();

  const regexTestString = `
SESSION_SECRET="4E="
GATEWAY_SECRET="G="
  `;
  const exp = new RegExp("(^[A-Z_1-9]+)=", "gm");
  t.assert(regexTestString.match(exp).length === 2);
  const envEntries = envContent.match(exp);
  const copyEntries = copyContent.match(exp);

  t.assert(envEntries.length === copyEntries.length);
  for (let i = 0; i < envEntries.length; i++) {
    t.assert(envEntries[i] === copyEntries[i]);
  }
});
