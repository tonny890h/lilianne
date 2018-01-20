/* @flow */
/* eslint-disable camelcase */

import {URL, parse as parseUrl} from 'url';
import qs from 'querystring';
import fetch from 'node-fetch';

import {Writable} from 'stream';
import {Handler, SongInfo} from '../handlers';
import type {ConfigOptions} from '../..';

export default class SoundCloud implements Handler {
  static match(link: string) {
    const parse = parseUrl(link);
    return parse.hostname === 'snd.sc' || /(www\.)?soundcloud\.com/.test(String(parse.hostname));
  }

  stream_url: string;
  key: string;
  link: string;

  constructor(link: string, config: $PropertyType<ConfigOptions, 'services'>) {
    this.link = link;
    if (config && config.soundcloud && config.soundcloud.client_id) {
      this.key = config.soundcloud.client_id;
    }
  }

  getMeta(cb: (error: ?Error, song?: SongInfo) => void) {
    if (!this.key) {
      process.nextTick(cb, new Error('no SoundCloud API key provided'));
      return;
    }

    const url = new URL('https://api.soundcloud.com/resolve');
    url.search = qs.stringify({
      url: this.link,
      client_id: this.key,
    });

    fetch(url.href, {redirect: 'follow'})
      .then((res: any) =>
        res.json().then((data: any) => {
          // check api error
          if (!res.ok) {
            const errs = (data && data.errors && data.errors.map((err: any) => err.error_message)) || [];
            cb(new Error(`SoundCloud API error (HTTP ${res.status}) - ${errs.join(', ')}`));
            return;
          }

          // check if streamable track
          if (data.kind !== 'track') return cb(new Error('URL is not a track'));
          if (!data.streamable) return cb(new Error('Track is not streamable'));
          if (!data.stream_url) return cb(new Error('No stream URL found'));

          this.stream_url = data.stream_url;

          cb(null, {
            id: data.id,
            title: data.title,
            url: data.permalink_url,
            image: data.artwork_url || data.user.avatar_url,
            duration: Math.floor(data.duration / 1000),
            plays: data.playback_count,
            uploader: {
              name: data.user.username,
              url: data.user.permalink_url,
            },
          });
        })
      )
      .catch((err: Error) => {
        console.error(err);
        cb(new Error(`SoundCloud API error - ${err.message}`));
      });
  }

  download(stream: Writable) {
    const url = new URL(this.stream_url);
    url.search = qs.stringify({client_id: this.key});
    fetch(url.href).then((res: any) => res.body.pipe(stream));
    return stream;
  }
}
