// Request banking check: node server/test-requests.js
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(require('path').join(__dirname, '../public/comp/index.html'), 'utf8');
const code = html.split('// rq-match start')[1].split('// rq-match end')[0];
const { rqSame } = new Function(code + 'return {rqSame};')();
const same = [['Sweet Bonanza', 'sweetbonanza'], ['Sweet Bonanza', 'Swet Bonanza'], ['Bonanza Megaways', 'bonanza'],
  ['Gates of Olympus', 'gates of olympus!!'], ['Odin\'s Gamble', 'odins gamble'], ['Ivan and the Immortal King', 'Ivan & the Immortal King'],
  ['Sugar Rush 1000', 'sugar rush 1k'], ['Temple Tumble 2', 'Temple Tumble II'], ['Big Bass Splash', 'Big bass splsh'],
  ['Extra Chilli Megaways', 'Extra Chili'], ['Money Train 4', 'moneytrain4'], ['Fortune Café Deluxe', 'fortune cafe deluxe']];
const apart = [['Sugar Rush', 'Sugar Rush 1000'], ['Temple Tumble', 'Temple Tumble 2'], ['Gates of Olympus', 'Gates of Olympus 1000'],
  ['Money Train 3', 'Money Train 4'], ['Big Bass Splash', 'Big Bass Bonanza'], ['Area 69', 'Area 51'], ['Wild West Gold', 'Wild West Duels'],
  ['Book of Dead', 'Book of Ra'], ['Sweet Bonanza', 'Sweet Bonanza Xmas']];
same.forEach(([a, b]) => assert(rqSame(a, b), `should bank: ${a} / ${b}`));
apart.forEach(([a, b]) => assert(!rqSame(a, b), `should stay apart: ${a} / ${b}`));
console.log('requests ok');
