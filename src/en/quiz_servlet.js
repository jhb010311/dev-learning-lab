// Quiz questions for the servlet lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'servlet', q: 'Which statement about the difference between a filter and an interceptor is correct?', a: ['A filter works at the servlet container level, in front of DispatcherServlet, and an interceptor works inside Spring MVC, before and after the controller', 'A filter works only on responses, and an interceptor works only on requests', 'A filter cannot use Spring beans, and only an interceptor can', 'The two differ only in name and work at the same place'], why: 'A request passes through the filters → DispatcherServlet → the interceptors → the controller, in that order. Spring Security works at the filter level.' },
]);
