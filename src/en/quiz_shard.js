// Quiz questions for the sharding lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 3, id: 'shard', q: 'You divided the data across several databases (sharding) by member ID. Which task becomes harder afterward?', a: ['Aggregating or sorting across all members, and joining data that sits on different shards', 'Looking up the information of one member by ID', 'Storing the orders of one member', 'No task becomes harder'], why: 'A task that finds data by the shard key needs to look at only one database, but a task that spans several shards has to query each one and combine the results in the application.' },
]);
