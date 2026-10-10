// Quiz questions for the mvc lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 1, id: 'mvc', q: 'In Spring MVC, what receives every request first and passes it on to the right controller?', a: ['DispatcherServlet', 'ViewResolver', 'An @Service bean', 'JdbcTemplate'], why: 'DispatcherServlet, as the front controller, receives the request, finds the controller through handler mapping, and calls it.' },
]);
