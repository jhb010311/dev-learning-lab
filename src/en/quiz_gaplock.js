// Quiz questions for the "Gap locks and next-key locks" lab. The first entry of a is the correct answer, and when sim is present the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'gaplock', q: 'In MySQL InnoDB at REPEATABLE READ, transaction A ran SELECT ... FOR UPDATE with the condition id BETWEEN 20 AND 30 (rows with id 20 and 30 exist). What happens when transaction B inserts a row with id = 25?',
    a: ['It waits until A finishes', 'It runs right away, without waiting', 'It fails at once and is rolled back', 'It is added to the result of A at once'],
    why: 'At REPEATABLE READ, a query that locks a range locks not only the rows but also the gaps between them. An INSERT into such a gap waits until A commits or rolls back.',
    sim: { c: { q: 'range', lv: 'RR', ins: '25' }, col: 2, has: 'Waits' } },
  { lv: 2, id: 'gaplock', q: 'At REPEATABLE READ, transaction A queried a row that does not exist (id = 25) with SELECT ... FOR UPDATE. There is no row to lock. What happens when transaction B inserts a row with id = 25?',
    a: ['It waits. There is no row, but the gap between 20 and 30 is locked', 'It runs right away. No row is locked, so nothing can block it', 'It runs right away. Gaps are locked only by a range condition', 'It fails. A row that does not exist cannot be queried FOR UPDATE'],
    why: 'When no row matches the condition, InnoDB sets a gap lock on the gap where that value would go. So an INSERT into the same place waits. This is also why "insert if absent" code can end in a deadlock, with two transactions waiting for each other.',
    sim: { c: { q: 'miss', lv: 'RR', ins: '25' }, col: 2, has: 'Waits' } },
  { lv: 2, id: 'gaplock', q: 'The isolation level is changed to READ COMMITTED, and transaction A runs the same range query (id BETWEEN 20 AND 30 ... FOR UPDATE). What happens when transaction B inserts a row with id = 25?',
    a: ['It runs right away. Gaps are not locked, so a new row can slip in', 'It waits. Gaps are always locked, whatever the isolation level is', 'It waits. READ COMMITTED locks a wider range than REPEATABLE READ', 'It fails. FOR UPDATE cannot be used at the READ COMMITTED level'],
    why: 'At READ COMMITTED, gap locking is not used for searches and index scans. Only the existing rows are locked, so a new row can go in between them, and when A runs the same query again it sees a row that was not there before (a phantom read).',
    sim: { c: { q: 'range', lv: 'RC', ins: '25' }, col: 2, has: 'Runs right away' } },
  { lv: 3, id: 'gaplock', q: 'At REPEATABLE READ, transaction A ran SELECT ... FOR UPDATE with the primary key condition id = 20 (an existing row). Why does the INSERT of id = 25 by transaction B run right away, without waiting?',
    a: ['A query that uses a unique index to find exactly one row locks only that row and does not lock the gaps', 'FOR UPDATE is a lock that blocks only reads, so it cannot block an INSERT made by another transaction', 'INSERT is designed from the start to run without ever conflicting with any lock held by a transaction', 'Gap locks are not used at REPEATABLE READ at all, and they are used only at the READ COMMITTED level'],
    why: 'Gap locking is not needed for a statement that uses a unique index to search for a unique row, because no new row matching that condition can appear. So only a record lock is set on the row with id = 20, and the gaps next to it stay free.',
    sim: { c: { q: 'hit', lv: 'RR', ins: '25' }, col: 2, has: 'Runs right away' } },
]);
