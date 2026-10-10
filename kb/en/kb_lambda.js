// Terms needed for the "Lambda expressions and functional interfaces" lab
module.exports = [
  ['Java language', 'Differences between anonymous classes and lambda expressions',
   'An anonymous class is syntax that implements an interface or a class right where it is used and creates an object without giving the class a name, and it is written in the form new InterfaceName() { method implementations }. A lambda expression is syntax that does the same thing more briefly, in the form (parameters) -> statement, but only for a functional interface, which has exactly one abstract method. When you implement a functional interface, the result of a call is the same whichever of the two you use. However, an anonymous class can also implement an interface that has several methods, and it can have fields, and this inside it refers to the object of the anonymous class itself. this inside a lambda expression refers to the enclosing object in which the lambda expression is written.'],
];
