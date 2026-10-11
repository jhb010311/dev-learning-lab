// Quiz questions for the tls lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 2, id: 'tls', q: 'What is the role of the server certificate in HTTPS?', a: ['It confirms, through the signature of a certificate authority, that the server you connected to really is the owner of that domain', 'It stores the user\'s password', 'It makes the server respond faster', 'It encrypts the browser\'s cookies'], why: 'A certificate contains the server\'s public key and domain, and a certificate authority (CA) signs it. The browser validates that signature.' },
]);
