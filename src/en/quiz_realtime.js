// Quiz questions for the realtime lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'realtime', q: 'Which choice best suits a feature like chat, where both the server and the browser must send messages often?', a: ['WebSocket', 'Polling that sends a request every minute', 'SSE (server-sent events)', 'A cache that uses 304 responses'], why: 'WebSocket communicates in both directions over one connection. SSE suits notifications that go in one direction only, from the server to the browser.' },
]);
