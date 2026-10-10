// Terms needed for the "What JPA solves" lab
module.exports = [
  ['JPA', 'JDBC',
   'The most basic standard API that a Java program uses to send SQL to a database and receive the results. You get a connection, pass the SQL statement to it as a string, fill in the values at the question marks and run it, and then take the column values one by one from the returned result (a ResultSet). Both writing the SQL and moving the values you took into the fields of an object are the developer\'s job. JPA and MyBatis also send SQL through JDBC internally. So even if you do not use JDBC directly, it helps to know what happens underneath.'],
  ['JPA', 'Object/relational impedance mismatch',
   'The gap that arises because Java objects and the tables of a relational database represent data in different ways. An object points to other objects with references and moves along those references, but a table row points to other rows with numbers called foreign keys and links them with joins. Each time you use new, you get a different object, but in a table, rows with the same primary key are the same row. Objects have inheritance, but tables do not. If you write the SQL yourself, the developer writes the conversion code that bridges this difference, and an ORM takes over that conversion. It is often also called the paradigm mismatch.'],
];
