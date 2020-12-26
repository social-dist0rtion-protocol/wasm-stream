# WASM-STREAM

> Server for [wasm-synth](https://github.com/TimDaub/wasm-synth) to stream data
> in web-compatible format.

## Why

This year's chaos communication congress is hosted in the [rc3
world](https://rc3.world/).  A RPG-inspired virtual environment called
[workadventure](https://workadventu.re/). Users can build their own maps within
workadventure, and so SDP is building [their own map
too](https://github.com/social-dist0rtion-protocol/r3c-map). Within a map, audio
streams can be added using HTML tags like `<audio>`.

As I've been eagerly hacking on
[wasm-synth](https://github.com/social-dist0rtion-protocol/r3c-map) since many
congresses, I saw this as a chance to build a mobile stage, artists can perform
on the wasm-synth.

## What Is WASM-STREAM?

WASM-STREAM is an attempt to plug an instrument into the internet. It's
simply a web-based synthesizer that renders `Float32Array`s using the `AudioWorklet`
and WebAssembly and sends this data to a user's sound card. When I saw that
this year's congress is happening remote, I thought, why not stream the 
sound it makes to everybody on the map. Like a concert.

## Architectural Overview

- [icecast2 server](http://audio.daubenschuetz.de)
- [webcast
  server](https://github.com/webcast/webcast.js/blob/master/SPECS.md) (this
  repository)
- Webcast integrated into WASM-SYNTH and sending mp3-encoded data

## Installation

```bash
$ cp .env_copy .env
$ vim .env
$ npm i
$ npm run dev
```

### Icecast configuration

When installing icecast, this
[tutorial](https://www.vultr.com/docs/install-icecast-on-ubuntu-18-04) is
helpful.  It automatically prompts the user to add some data. Additionally, it
creates a configuration file at `/etc/icecast2/icecast.xml`. The following is
necessary to add into the config file:

```xml
<mount>
    <username>user</username>
    <password>pass</password>
    <mount-name>/stream</mount-name>
    <max-listeners>100000</max-listeners>
    <public>1</public>
    <fallback-mount>stream2.ogg</fallback-mount>
</mount>
```

That allows a user to connect at `/stream` and broadcast to any listener.

## Production

We're using PM2 for deploying and managing the server in production.
An `ecosystem.config.js` file is provided.
