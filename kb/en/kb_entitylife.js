// Terms needed for the "The lifecycle of an entity" lab
module.exports = [
  ['JPA', 'The four entity states',
   'The classification of how an entity object relates to the persistence context, also called the entity lifecycle. New means that the object was only created with new and JPA does not know about it (Hibernate calls this state transient). Managed means that the persistence context manages the object, because you handed it over with em.persist or loaded it. Detached means that the object was managed and then came off. Removed means that the object was made a target to delete with em.remove. Features such as dirty checking, where changing a value sends an UPDATE, and the first-level cache work only for entities in the managed state. So when a value is not applied to the DB, first check which state the object is in now.'],
];
