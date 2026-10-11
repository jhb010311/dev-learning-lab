// Quiz questions for the container lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 1, id: 'container', q: 'Why are containers lighter and quicker to start than virtual machines?', a: ['Because they do not boot a whole operating system, and instead share the kernel of the host and isolate only the processes', 'Because a smaller operating system is installed separately for each container', 'Because containers do not use memory', 'Because containers do not use the network'], why: 'Each virtual machine boots its own guest operating system. A container is an isolated process.' },
]);
