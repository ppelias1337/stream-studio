/**
 * Chat parsing checks — run with: node server/test-chat.js
 *
 * The lines below are shaped exactly like what Twitch and Kick sent on 2026-09-14.
 */

const assert = require('assert');
const { matchesKeyword, parseTwitch, parseKick, channelName, youtubeId } = require('./chat');
assert(youtubeId('https://www.youtube.com/live/abcdefghijk?si=x') === 'abcdefghijk');
assert(youtubeId('https://youtu.be/abcdefghijk') === 'abcdefghijk');
assert(youtubeId('not a link') === '');

assert(matchesKeyword('!join', '!join'));
assert(matchesKeyword('  !JOIN  ', '!join'));
assert(matchesKeyword('!join pls pick me', '!join'));
assert(!matchesKeyword('!joining', '!join'));
assert(!matchesKeyword('i want to !join', '!join'));
assert(!matchesKeyword('anything', ''));
assert(matchesKeyword('LMS!', 'LMS'));
assert(matchesKeyword('lms!!! me', 'LMS'));
assert(matchesKeyword('LMS LMS LMS', 'LMS'));
assert(!matchesKeyword('LMSS', 'LMS'));

const tw = parseTwitch('@badge-info=subscriber/60;badges=subscriber/60;color=#FFFCE4;display-name=wickEd_tf;mod=0 ' +
                       ':wicked_tf!wicked_tf@wicked_tf.tmi.twitch.tv PRIVMSG #somechannel :!join now');
assert.deepStrictEqual(tw, { user: 'wicked_tf', name: 'wickEd_tf', text: '!join now' });
// A localised display name is not the handle: use the login.
assert.strictEqual(parseTwitch('@display-name=한국어 :kr_user!kr_user@x PRIVMSG #c :!join').name, 'kr_user');
assert.strictEqual(parseTwitch(':tmi.twitch.tv 366 justinfan1 #c :End of /NAMES list'), null);
assert.strictEqual(parseTwitch('PING :tmi.twitch.tv'), null);

const kick = parseKick(JSON.stringify({
  event: 'App\\Events\\ChatMessageEvent', channel: 'chatrooms.1.v2',
  data: JSON.stringify({ content: '!join', type: 'message', sender: { username: 'Majortek', slug: 'majortek' } })
}));
assert.deepStrictEqual(kick, { user: 'majortek', name: 'Majortek', text: '!join' });
assert.strictEqual(parseKick('{"event":"pusher:ping","data":{}}'), null);
assert.strictEqual(parseKick('not json'), null);

assert.strictEqual(channelName('https://kick.com/SomeName/'), 'somename');
assert.strictEqual(channelName('#SomeName'), 'somename');

console.log('all chat checks passed');
