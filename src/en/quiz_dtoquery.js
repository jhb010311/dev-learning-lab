// Quiz questions for the "Querying directly into a DTO" lab. The first entry of a is the correct answer; if sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'dtoquery', q: 'You queried with select new dtoquery.MemberDto(m.name, m.age) from Member m in JPQL. What does the SELECT clause of the SQL contain?',
    a: ['Only the columns name and age, which correspond to the values passed to the constructor', 'All the columns of Member, and Java picks out two of them', 'A DTO is not a table, so it queries only the number of rows, with no columns', 'Three columns in all: id and the two columns passed to the constructor'],
    why: 'The new in JPQL queries only the values to pass to the constructor. Even if the member has six columns, the SQL reads only the two columns name and age, and calls the constructor of MemberDto for each row that comes back.',
    sim: { c: { how: 'dto', team: false, mod: false }, col: 1, has: '2' } },
  { lv: 2, id: 'dtoquery', q: 'You called setName on a DTO that you queried with new in JPQL to change the name. Why is no UPDATE sent when the transaction commits?',
    a: ['A DTO is not an entity, so the persistence context does not manage it', 'It is defined that a change to a DTO is applied only when you call save separately', 'A query that uses new runs in a read-only transaction', 'DTOs are collected after the commit and applied all at once'],
    why: 'Dirty checking compares the current values of the entities managed by the persistence context with their snapshots. A DTO is a plain object without @Entity, so it does not enter the persistence context and has no snapshot. Changing its values has nothing to do with the DB.',
    sim: { c: { how: 'dto', team: false, mod: true }, col: 3, has: '0 (only the DTO changed; the DB is unchanged)' } },
  { lv: 3, id: 'dtoquery', q: 'Four members are divided between two teams, and the team uses lazy fetching. You queried the members with select m from Member m, and then in a loop you put m.getTeam().getName() into the DTO. How many SELECT statements are sent in total?',
    a: ['3. One query for the members, and 2 more for the teams', '1. The teams are read together when the members are queried', '5. One query for the members, and 4 more, as many as the members', '2. One query for the members, and one query for all the teams'],
    why: 'A team that uses lazy fetching is queried at the moment you get its name. A team that has been read once is in the persistence context and is not queried again, so the extra queries equal the number of different teams, not the number of members. If you join the team in the new of JPQL, it ends in one query.',
    sim: { c: { how: 'entity', team: true, mod: false }, col: 0, has: '3 (1 for members + 2 for teams)' } },
  { lv: 3, id: 'dtoquery', q: 'You want to build a feature that modifies the name of a member. How should you query?',
    a: ['Query the entity and change its value. It is a managed entity, so an UPDATE is sent at commit', 'Query directly into a DTO and change its value. Only the needed columns are read, so the UPDATE is light too', 'Whichever way you query, changing a value causes an UPDATE at commit', 'Whichever way you query, no UPDATE is sent, so you have to write the SQL yourself'],
    why: 'The persistence context manages only entities. If you query an entity and change its value, an UPDATE is sent by dirty checking, and changing a DTO does not change the DB. Querying into a DTO is for screens that only display data.',
    sim: { c: { how: 'entity', team: false, mod: true }, col: 3, has: '1 (the name in the DB changed to Erin)' } },
]);
