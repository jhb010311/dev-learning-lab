// Quiz questions for the "HTTP/1.1, 2, 3" lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 2, id: 'httpver', q: 'What is a typical improvement of HTTP/2 over HTTP/1.1?', a: ['Several requests and responses are exchanged at the same time over one connection', 'It uses UDP instead of TCP', 'It is faster because it does no encryption', 'It opens a new connection for every request'], why: 'HTTP/2 divides one TCP connection into several streams (multiplexing). It is HTTP/3 that runs over UDP.' },
]);
