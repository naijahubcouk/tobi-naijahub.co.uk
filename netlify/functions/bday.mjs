// 🎂 Auntie Tobi Birthday Cards — /.netlify/functions/bday (artwork + loved-one photos for card links)
import * as netlifyBlobs from '@netlify/blobs';
import v2 from './studio-lib/v2.js';
import mod from './studio-lib/handlers/bday.js';

v2.useBlobs(netlifyBlobs);

export default v2.toV2(mod.handler);
