// Quiz questions for the "HTTP caching and ETag" lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 2, id: 'etag', q: 'The server responded with 304 Not Modified. What does it mean?', a: ['The copy the browser has is still valid, so use it without a body', 'The requested resource was deleted', 'The resource has moved to another address', 'The server did not understand the request'], why: 'When the browser asks with a condition such as the ETag and nothing has changed, the server does not send the body again, which reduces the amount transferred.' },
]);
