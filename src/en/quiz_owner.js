// Quiz questions for the "The owning side of a relationship" lab. The first entry of a is the correct answer. If sim is present, the answer is checked against the result of the lab's model.
Lab.quiz([
  { lv: 1, id: 'owner', q: 'In a bidirectional relationship, what does the owning side of the relationship do?',
    a: ['It is responsible for putting in and changing the value of the foreign key in the database', 'It becomes the one of the two entities that is saved first', 'It becomes the only side from which you can look up the other entity', 'It becomes the side that is deleted together when the other side is deleted'],
    why: 'The objects have two references, but the foreign key in the database is only one. JPA looks at only the reference on the side that is designated as the owner when it writes the foreign key. The side that is not the owner (the side with mappedBy) is used only for reading.' },
  { lv: 2, id: 'owner', q: 'You added a member only to Team.members, which has mappedBy, and saved. There is no exception, but member.team_id is null. Why?',
    a: ['When JPA writes the foreign key, it reads only the value of Member.team, which is the owning side', 'The team was persisted before the member, so the order was wrong', 'A value put in a collection is reflected only after the commit is finished', 'The IDENTITY strategy cannot store a foreign key'],
    why: 'mappedBy is a marker that says "the foreign key is managed by the field on the other side". When JPA builds the INSERT, it reads only the Member.team field, and that value is null, so team_id is null too. It is not treated as incorrect use, so no exception is thrown either.',
    sim: { c: { set: 'inverse', clear: false, mp: true }, col: 0, has: 'null' } },
  { lv: 3, id: 'owner', q: 'You only called member.setTeam(team) and saved. Then, without flush and clear, you read team.getMembers().size() in the same transaction. What is the result?',
    a: ['0. The foreign key was stored, but the list in memory is empty', '1. The foreign key was stored, so it is visible in the list right away', '0. If you set only the owning side, the foreign key is not stored either', 'An exception is thrown. You read the list without filling it'],
    why: 'em.find returns the original team object that is in the first-level cache as it is. Nothing was put in the list of that object, so the result is 0. team_id is stored as 1 in the database, so the database and memory disagree. This is why you set both sides.',
    sim: { c: { set: 'owner', clear: false, mp: true }, col: 1, has: '0' } },
  { lv: 3, id: 'owner', q: 'You made the relationship bidirectional but left out mappedBy on Team.members. If you set both sides and save, which tables are created?',
    a: ['Three: team, member, and the join table team_member', 'Two, team and member, and team_id is stored twice', 'Two, team and member, and a warning appears at startup', 'A mapping error throws an exception at startup, so no tables are created'],
    why: 'Without mappedBy, JPA treats Team.members as another relationship that has nothing to do with Member.team. A join table is created separately to store this relationship, and when you save, an INSERT is sent to that table too.',
    sim: { c: { set: 'both', clear: false, mp: false }, col: 3, has: 'team_member' } },
]);
