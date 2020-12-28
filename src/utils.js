// @format

function genWavNoise() {
  const noise = new Float32Array(64 * 1000);
  for (let i = 0; i < noise.length; i++) {
    noise[i] = Math.random() / 1000;
  }

  return noise;
}

module.exports = {
  genWavNoise
};
