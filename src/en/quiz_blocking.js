// Quiz questions for the blocking lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'blocking', q: 'A server with 200 threads for handling requests calls an external API that takes 3s to respond. What happens when 300 requests arrive at the same time?', a: ['All 200 threads are tied up waiting for responses, and the remaining requests wait until a thread becomes free', 'All 300 requests are handled at the same time', 'The number of threads automatically grows to 300', 'The external API calls are canceled automatically'], why: 'A blocking call holds its thread while it waits. When there are not enough threads, the requests that come after wait.' },
]);
