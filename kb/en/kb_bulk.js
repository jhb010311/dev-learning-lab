// Terms needed for the "Bulk update and delete operations" lab
module.exports = [
  ['JPA', 'Bulk update and delete operations',
   'A way to change or delete many rows at once with a single UPDATE or DELETE statement, instead of changing entities one by one. You build the query in JPQL and run it with executeUpdate(), and the number of rows changed is returned. Changing entities one by one with dirty checking sends as many SQL statements as there are rows, but a bulk operation needs only one. However, this SQL runs directly on the database without going through the persistence context, so entities you already loaded keep their old values. So you run the bulk operation before you load the entities, or you empty the persistence context with em.clear() after it.'],
  ['JPA', 'em.clear and em.refresh',
   'Two ways to bring the persistence context back in line with the database when they disagree. em.clear() empties the whole persistence context, so later queries read fresh values from the database. The entity objects you held before emptying become detached, so changing their values is not applied to the database. em.refresh(entity) reads only the entity you specify again from the database and overwrites the values of that object. If you call clear while there are changes that have not been sent to the database, those changes are lost.'],
];
