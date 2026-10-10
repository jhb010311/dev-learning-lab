// Quiz questions for the "Access modifiers and encapsulation" lab. The first entry of a is the correct answer, and when sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'access', q: 'If you write no access modifier before a field, where can that field be used?',
    a: ['Only in classes in the same package', 'Only inside the class that declares it', 'In the same package and in subclasses in other packages', 'In any class in any package'],
    why: 'With no access modifier, the member is package-private and can be used only inside the same package. private narrows access to the same class, protected widens it to subclasses in other packages, and public allows use from anywhere.',
    sim: { c: { mod: 'package', from: 'pkg' }, col: 0, has: 'Success' } },
  { lv: 2, id: 'access', q: 'Which is the best reason for keeping a field private and allowing its value to be changed only through public methods?',
    a: ['Outside code cannot change the value freely, and the checks that a change must pass can be kept in one place', 'A private field uses less memory and is much faster to read than a public field', 'A private field becomes a constant whose value never changes at run time', 'The compiler does not allow objects to be created from a class that has a public field'],
    why: 'Hiding a field narrows the ways of changing its value down to the methods of that class. A method can filter out invalid values, and you can change the internal structure without having to modify outside code. This is encapsulation. private has nothing to do with speed or with whether something is a constant.' },
  { lv: 2, id: 'access', q: 'Account in the bank package has protected int balance. The Teller class is in the same bank package but does not extend Account. What happens when Teller reads acc.balance?',
    a: ['It compiles, because it is in the same package', 'A compile-time error occurs, because it is not a subclass', 'It compiles, but an exception is thrown at run time', 'Reading is allowed, but changing the value is not'],
    why: 'protected is open not only to subclasses but also to every class in the same package. That is because it gives wider access than package-private. Access is checked at compile time, and reading and writing are not treated separately.',
    sim: { c: { mod: 'protected', from: 'pkg' }, col: 0, has: 'Success' } },
  { lv: 3, id: 'access', q: 'bank.Account has protected int balance, and SavingAccount in a different package extends Account. What happens when other.balance is read inside the method int read(Account other) of SavingAccount?',
    a: ['A compile-time error occurs, because the access is through a variable of the superclass type', 'It compiles without any problem, because the code is inside a subclass', 'It compiles, and an exception is thrown only when other is not a SavingAccount', 'It compiles once other is confirmed not to be null'],
    why: 'A subclass in a different package can use a protected member only through its own type. this.balance and the balance of a variable of type SavingAccount are allowed, but access through a variable of type Account is not. The compiler decides by looking at the declared type of the variable, not at the actual object.',
    sim: { c: { mod: 'protected', from: 'subParent' }, col: 2, has: 'balance has protected access' } },
]);
