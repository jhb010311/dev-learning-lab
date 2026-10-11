// Terms added together with the "TCP and UDP" lab
module.exports = [
  ['Web and networking', 'Byte stream and datagram', 'These are the two shapes in which data is carried. A byte stream is a flow in which bytes continue in order without a break, and TCP works this way. How many writes the sender used is not passed on, so data sent in three writes may be read in one read, and data sent in one write may be read in several reads. A datagram is a way in which a piece sent at one time is delivered as it is, as a single unit, and UDP works this way; pieces are not merged or split when they are read. So a program that exchanges messages over TCP has to mark the end of a message itself, by writing the length first or by putting in a delimiter.'],
];
