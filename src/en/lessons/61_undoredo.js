Lab.register({
  id: 'undoredo', nav: 'Undo and redo logs', cat: 'Database', mode: 'step',
  title: 'Why does the data survive even if the power goes out right after a commit?',
  intro: 'When a database changes data, it does not modify the data file right away. It changes the data in memory first and leaves two records: one needed to undo the change (undo) and one needed to apply it again (redo).',
  terms: ['Undo log and redo log', 'ACID', 'MVCC (multiversion concurrency control)', 'Transaction'], ranks: ['dbengine', 'isolation'],
  controls: [
    { id: 'what', label: 'What happens', type: 'select', value: 'crashAfter', options: [['commit', 'A normal commit'], ['rollback', 'A rollback without committing'], ['crashAfter', 'The server goes down right after the commit (before the write to the data file)'], ['crashBefore', 'The server goes down before the commit']] },
  ],
  presets: [
    { t: 'Default settings', q: 'If the server goes down right after the commit, before the write to the data file, what is the value after a restart?', d: 'A failure right after the commit. The data file holds the old value, but after a restart the value is the new one.', v: { what: 'crashAfter' } },
    { t: 'A failure before the commit', q: 'What if the server goes down before the commit?', d: 'After a restart, the change is as if it never happened.', v: { what: 'crashBefore' } },
    { t: 'Rollback', q: 'What if you roll back without committing?', d: 'The data is returned to the earlier value that was kept in the undo log.', v: { what: 'rollback' } },
    { t: 'A normal commit', q: 'What if it is a normal commit?', d: 'At commit time, only the log is written to disk.', v: { what: 'commit' } },
  ],
  code: function (c) {
    return 'START TRANSACTION;\nUPDATE account SET balance = 500 WHERE id = 1;   -- it was 1000\n' + (c.what === 'rollback' ? 'ROLLBACK;' : c.what === 'crashBefore' ? '-- (the server goes down here)' : 'COMMIT;' + (c.what === 'crashAfter' ? '\n-- (the server goes down right after the commit reply)' : ''));
  },
  label: function (c) { return { commit: 'A normal commit', rollback: 'Rollback', crashAfter: 'Failure right after the commit', crashBefore: 'Failure before the commit' }[c.what]; },
  columns: ['Final balance', 'Used to undo', 'Used to reapply', 'Property guaranteed'],
  simulate: function (c) {
    var ev = [], sum = [], S = { mem: '1000', file: '1000', redo: '(empty)', undo: '(empty)', tx: 'Not started' }, W = c.what, fin, usedU = 'Not used', usedR = 'Not used', prop;
    function push(s, k) { ev.push({ s: s, k: k, snap: JSON.parse(JSON.stringify(S)) }); }
    push('The balance of account 1 is 1000. This value is in the data file on disk, and the same value is also loaded in memory (the buffer pool).', '');
    S.tx = 'In progress'; S.undo = 'Earlier value of account 1 = 1000'; push('The UPDATE starts. First, the value before the change, 1000, is recorded in the undo log. It is used when the change has to be undone, and when another transaction has to read the value from before the commit (MVCC).', '');
    S.mem = '500 (not written to disk yet)'; push('The data held in memory is changed to 500. The data file on disk is still 1000. Changing the data file right away every time would require writes to many places on the disk, which is slow, so the changes are written later in a batch.', '');
    S.redo = '"Account 1 = 500" (in the log buffer in memory)'; push('What was changed, and how, is recorded in the redo log. A log only needs to be appended to the end of a file, so this is much faster than changing the data file.', '');
    if (W === 'rollback') {
      S.mem = '1000'; S.tx = 'Rolled back'; S.undo = '(to be cleaned up after use)'; usedU = 'Undo log'; fin = '1000'; prop = 'Atomicity';
      push('ROLLBACK: The data in memory is returned to the earlier value, 1000, which was kept in the undo log. Everything the transaction did is canceled.', 'good');
      sum.push('A rollback is done with the undo log. The undo log supports "all applied or all canceled" (atomicity).');
    } else if (W === 'crashBefore') {
      S.redo = '"Account 1 = 500" (maybe partly on disk, no committed note)'; push('The server went down before the commit. Everything in memory is lost. What remains on disk is the data file (1000) and the log that had been written to disk.', 'bad');
      S.mem = '(restarting)'; S.tx = 'Aborted'; push('The server starts again. Recovery reads the redo log, applies again the changes that remain on disk, and then finds the transactions that have no record that they committed.', '');
      S.mem = '1000'; S.tx = 'Rolled back (during recovery)'; usedU = 'Undo log'; usedR = 'Redo log (at the start of recovery)'; fin = '1000'; prop = 'Atomicity';
      push('The changes of the transaction that was not committed are undone using the undo log. The balance is 1000. The user never received a "commit succeeded" reply, so this result is correct.', 'good');
      sum.push('Changes that were not committed do not remain after a failure. Recovery undoes them with the undo log.');
    } else {
      S.redo = '"Account 1 = 500" + committed note (on disk)'; S.tx = 'Committed';
      push('COMMIT: The redo log is written to disk for certain (fsync). Only after this is done does the server reply "commit succeeded" to the user. Even at this point the data file is still 1000. What is written to disk at commit time is only the log.', 'good');
      if (W === 'commit') {
        S.file = '500'; S.mem = '500'; usedR = 'Not used (no failure occurred)'; fin = '500'; prop = 'Durability';
        push('A while later, a background task writes the changed data in memory to the data file (flushing). Now the data file also holds 500. After that, the corresponding redo log is no longer needed.', '');
        sum.push('The speed of a commit is set by the speed of writing the log to disk. Reflecting the changes in the data file is done later, in batches.');
      } else {
        S.mem = '(lost)'; push('The server went down right after the commit reply, before the changes were written to the data file. The 500 in memory is lost, and the data file still holds 1000. The user has already received "success".', 'bad');
        S.mem = '(restarting)'; push('The server starts again. Recovery reads the redo log on disk from the beginning.', '');
        S.mem = '500'; S.file = '500'; usedR = 'Redo log'; fin = '500'; prop = 'Durability';
        push('The redo log has "account 1 set to 500" and the record that it committed. This change is applied again. The balance is recovered as 500. No committed data was lost.', 'good');
        sum.push('A committed change is recovered from the redo log even if it was not yet written to the data file. The redo log supports "what is committed remains even after a failure" (durability).');
      }
    }
    sum.push('Writing the log to disk before the data in this way is called write-ahead logging (WAL). Undo is in charge of "rolling back" and "showing earlier versions", and redo is in charge of "reapplying".');
    return { events: ev, summary: sum, row: [fin, usedU, usedR, prop] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : null;
    if (!s) { H.text(v, 'Press Run to start.'); return; }
    H.table(v, ['Location', 'Content'], [
      { cells: ['Memory (buffer pool)', { v: s.mem, cls: s.mem.indexOf('500') === 0 ? 'hot' : s.mem.indexOf('lost') >= 0 ? 'bad' : '' }] },
      { cells: ['Disk: data file', { v: s.file, cls: s.file === '500' ? 'good' : '' }] },
      { cells: ['Disk: redo log', { v: s.redo, cls: s.redo.indexOf('committed note (') >= 0 ? 'good' : '' }] },
      { cells: ['Undo log', s.undo] },
    ], 'Where the balance of account 1 is stored');
  },
  // Diagram: The top is memory, which is lost when the server goes down, and the bottom is the disk, which stays. How far the change has been recorded decides the difference between a commit and recovery.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], s = last ? last.snap : { mem: '1000', file: '1000', redo: 'empty', undo: 'empty', tx: 'Not started' }, gone = s.mem.indexOf('lost') >= 0, redoOk = s.redo.indexOf('committed note (') >= 0;
    P.size(680, 322);
    P.box('tx', 16, 16, 648, 36, { cls: s.tx.indexOf('Commit') >= 0 ? 'good' : s.tx.indexOf('Rolled back') >= 0 ? 'bad' : 'plain', title: 'Transaction state', right: s.tx });
    P.region('ram', 16, 66, 648, 84, 'Memory: lost when the server goes down');
    P.box('mem', 28, 100, 624, 38, { cls: gone ? 'bad' : s.mem.indexOf('500') === 0 ? 'hot' : 'plain', title: 'Balance loaded in the buffer pool', right: s.mem });
    P.region('disk', 16, 164, 648, 142, 'Disk: kept even when the server goes down');
    P.box('redo', 28, 198, 624, 30, { cls: redoOk ? 'good' : 'plain', title: 'Redo log', right: s.redo });
    P.box('undo', 28, 232, 624, 30, { cls: 'plain', title: 'Undo log', right: s.undo });
    P.box('file', 28, 266, 624, 30, { cls: s.file === '500' ? 'good' : 'plain', title: 'Data file', right: s.file });
    if (redoOk && !gone) P.arrow('wr', 'mem:b:0.15', 'redo:t:0.15', { cls: 'good' });
    P.note('A commit does not mean "written to the data file". It means "recorded in the redo log". Even if the value in memory is lost, it can be rebuilt as long as the redo log remains, and changes that were not committed are undone with the earlier values in the undo log.');
  },
  assume: 'This is a simplified version of the structure of MySQL InnoDB. Details are left out, such as the fact that changes to the undo log are themselves protected by the redo log, and the log buffer and the several stages of writing to disk. Writing the redo log to disk at every commit is the behavior of the default setting (innodb_flush_log_at_trx_commit=1). These results were not confirmed by causing failures in a real database; the lab restates what the MySQL documentation explains.',
});
