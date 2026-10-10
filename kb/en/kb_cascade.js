// Terms needed for the "Cascade and orphan removal" lab
module.exports = [
  ['JPA', 'Cascade',
   'A setting that passes an operation performed on a parent entity on to its associated child entities in the same way. You write it in the cascade attribute of an association annotation such as @OneToMany or @OneToOne. CascadeType.PERSIST passes on saving, REMOVE passes on deletion, and ALL passes on every operation. Without it, persisting only the parent does not save the children, and removing a parent that still has children fails because of the foreign key constraint. It is a convenience that passes operations on, not a feature that sets up the relationship, and you use it when only that one parent owns the children.'],
  ['JPA', 'Orphan removal (orphanRemoval)',
   'A setting that also deletes from the DB a child entity that has been disconnected from its parent entity. You write it as orphanRemoval = true on @OneToMany or @OneToOne. If you take a child out of the parent\'s collection, a DELETE for that child is sent when the transaction commits. Without this setting, the row in the DB stays even if you take the child out of the collection. Children are also deleted when the parent is deleted, so you can think of it as including the behavior of CascadeType.REMOVE. Do not use it for a child that other entities also refer to.'],
];
