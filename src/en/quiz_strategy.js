// Quiz questions for the strategy lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'strategy', q: 'Some code gains another if-else branch every time a payment method is added. How should you change it so that adding a new payment method does not require modifying the existing code?', a: ['Define the way of paying as an interface, create an implementing class for each payment method, and inject them', 'Replace the branches with a switch statement', 'Gather all the payment code into a single static method', 'Define the payment methods as string constants'], why: 'This is the Strategy pattern. The calling code knows only the interface, and adding a new payment method takes nothing more than adding an implementing class.' },
]);
