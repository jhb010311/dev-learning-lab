// Quiz questions for the oauth lab. The first entry of a is the correct answer.
Lab.quiz([
  { lv: 3, id: 'oauth', q: 'In "Log in with Google" (the OAuth 2.0 authorization code grant), does the server of our service receive the user\'s Google password?', a: ['No. The user logs in on the Google page, and our server receives an authorization code and exchanges it for a token', 'Yes. Our server logs in to Google on the user\'s behalf', 'Yes. But it receives only a hashed value', 'No. Google stores the user\'s password directly in our database'], why: 'The password is entered only at Google. Our service receives only a token that can access the information the user consented to share.' },
]);
