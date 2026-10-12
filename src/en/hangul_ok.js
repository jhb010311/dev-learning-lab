// Korean text that is allowed to remain in the English edition, per lab id.
// Only data that the lab is about may be listed here (for example, the three Korean characters whose
// UTF-8 bytes the I/O lab writes and reads). Everything else in the English files must be English.
module.exports = {
  iobuf: ['가나다', '가', '나', '다'],
  // the URL lab percent-encodes a Korean search term
  url: ['겨울 옷', '겨울', '옷'],
  // the file I/O fundamentals lab is about Korean characters taking 3 bytes each in UTF-8
  io_basic: ['가A', '가나', '가', '나'],
};
