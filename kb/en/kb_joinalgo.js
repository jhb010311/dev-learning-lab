// Concept notes needed for the "Join algorithms" lab
module.exports = [
  ['Database', 'Nested-loop join',
   'A join method that reads the rows of one table one at a time and, for each row, finds the matching rows in another table. It has the same shape as a double loop (nested loops) in a program, which is where the name comes from. The amount read is the number of rows in the table read first multiplied by the number of rows read per lookup. If the join column of the table read later has an index, only the rows needed are read, but if it does not, the whole table must be read each time.'],
  ['Database', 'Hash join',
   'A join method that builds in memory a hash table keyed on the join column values of the rows of one table, and then reads the other table once, finding the matches in that hash table. Each table is read only once, so it reads far less than joining with a nested loop without an index. MySQL supports it from 8.0.18, and chooses it when there is no index that can be used for the join column. Compared with a join that uses an index, it has the disadvantages that the hash table takes memory and that the table is read in full even when only some of its rows are needed.'],
  ['Database', 'Driving table',
   'The table that is read first in a join. In a nested-loop join, the rest of the tables are looked up for each row of this table. Which table becomes the driving table is decided not by the order written in FROM but by the optimizer calculating costs. The one chosen is usually the table that has fewer rows after filtering by conditions and whose counterpart table can then be reached through an index. In MySQL, the table on the upper line of the EXPLAIN result is the driving table.'],
];
