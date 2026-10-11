// Quiz questions for the rate limiting lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'ratelimit', q: 'What status code do you return to a request that was stopped by rate limiting?', a: ['429 Too Many Requests', '404 Not Found', '500 Internal Server Error', '301 Moved Permanently'], why: 'It means the allowed amount was exceeded and the client should try again a little later. The Retry-After header can also tell the client how long to wait.' },
]);
