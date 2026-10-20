Lab.register({
  id: 'oauth', nav: 'OAuth login flow', cat: 'Authentication', mode: 'step',
  title: 'What is exchanged when you click "Log in with Kakao"',
  why: 'If a user is asked for their ID and password of another service in order to fetch data from that service, the receiving side gets every permission, more places can leak the password, and the user cannot cut off that access until they change the password. OAuth 2.0 has a token with a defined scope and expiry issued instead of the password, so that access is limited to what the user allowed and that permission alone can be withdrawn later.',
  use: 'It is used for social login such as "Log in with Kakao" and "Log in with Google", and for integrations that read and write, on a user\'s behalf, data in another service, such as their calendar or drive. In Spring, Spring Security\'s OAuth2 client handles this flow. For login purposes, OpenID Connect, which standardizes identity verification on top of OAuth 2.0, is sometimes used together.',
  intro: 'Social login is a procedure in which our service gets permission to access a user\'s information, with the user\'s consent, without ever receiving the user\'s password. Some things travel through the browser, and others are exchanged directly between servers.',
  terms: ['OAuth 2.0', 'Authentication and authorization', 'Access token and refresh token', 'Cross-site request forgery (CSRF)'], ranks: ['auth', 'websec'],
  controls: [
    { id: 'sc', label: 'Scenario', type: 'select', value: 'ok', options: [['ok', 'Normal login'], ['deny', 'The user cancels on the consent screen'], ['state', 'The state value in the returning request is different (forged request)'], ['reuse', 'An attempt to reuse an intercepted authorization code']] },
  ],
  presets: [
    { t: 'Default settings', q: 'What is exchanged in the authorization code flow when you click "Log in with Kakao"?', d: 'The whole flow of the authorization code grant.', v: { sc: 'ok' } },
    { t: 'The user cancels the consent', q: 'What if the user cancels on the consent screen?', d: 'An error comes back instead of a code.', v: { sc: 'deny' } },
    { t: 'The state value is different', q: 'What if the state value in the returning request is different?', d: 'It is not a request that our service started, so it is rejected.', v: { sc: 'state' } },
    { t: 'Intercept and reuse the authorization code', q: 'What if someone tries to reuse an intercepted authorization code?', d: 'A code can be used only once, and only together with the client secret.', v: { sc: 'reuse' } },
  ],
  code: function () {
    return '# application.yml (Spring Security OAuth2 client)\nspring.security.oauth2.client:\n  registration.kakao:\n    client-id: abc123                   # a value that may be public\n    client-secret: "********"           # a value only the server knows (hidden here)\n    client-authentication-method: client_secret_post\n    authorization-grant-type: authorization_code\n    redirect-uri: https://shop.example/login/oauth2/code/kakao\n    scope: profile_nickname, account_email\n  # Kakao is not a provider whose addresses Spring Security already knows,\n  # so the addresses of its authorization server and API server are written here\n  provider.kakao:\n    authorization-uri: https://kauth.kakao.com/oauth/authorize\n    token-uri: https://kauth.kakao.com/oauth/token\n    user-info-uri: https://kapi.kakao.com/v2/user/me\n    user-name-attribute: id\n\n# Spring Security handles the steps below for you';
  },
  label: function (c) { return { ok: 'Normal login', deny: 'User cancels consent', state: 'state mismatch', reuse: 'Authorization code reuse attempt' }[c.sc]; },
  columns: ['Result', 'What our service received', 'Where the user\'s password was seen'],
  simulate: function (c) {
    var ev = [], rows = [], sum = [], res, got = 'Nothing';
    function step(from, to, via, what, s, k) { rows.push({ cells: [from + ' → ' + to, via, { v: what, cls: k === 'bad' ? 'bad' : k === 'good' ? 'good' : '' }] }); ev.push({ s: s, k: k, snap: { rows: rows.slice() } }); }
    step('User', 'Our service', 'Browser', 'Clicks "Log in with Kakao"', 'The user presses the "Log in with Kakao" button on our service (shop.example).', '');
    step('Our service', 'Kakao authorization server', 'Browser redirect', 'client_id, redirect_uri, scope, state=x9f2', 'Our service redirects the browser to the authorization endpoint of Kakao. It attaches who is making the request (client_id), the address to return to when finished (redirect_uri), the range of information it wants (scope), and a random value that identifies this request (state). Our service remembers the state in the session.', '');
    if (c.sc === 'deny') {
      step('User', 'Kakao authorization server', 'Browser', 'Logs in, then presses "Cancel" on the consent screen', 'The user logs in to Kakao, then presses Cancel on the consent screen for sharing information.', '');
      step('Kakao authorization server', 'Our service', 'Browser redirect', 'error=access_denied, state=x9f2', 'Kakao sends the browser back with an error attached instead of an authorization code. Our service shows a login failure screen. Without the user\'s consent, it gets no permission at all.', 'bad');
      res = 'Login failed (consent denied)'; sum.push('The core of OAuth is the user\'s consent. If the user does not consent, our service cannot access any of the user\'s information.');
    } else {
      step('User', 'Kakao authorization server', 'Browser', 'Enters Kakao ID and password, gives consent', 'The user logs in on the Kakao page and gives consent to share information. The ID and password are entered only at Kakao. Our service cannot see them.', '');
      if (c.sc === 'state') {
        step('Link made by an attacker', 'Our service', 'Browser redirect', 'code=the attacker\'s code, state=none or a different value', 'A request arrives at the return address of our service, but its state value is different from the x9f2 remembered in the session. This is not a login that this user started. It is a request that came in because the user clicked a link someone had prepared.', 'bad');
        step('Our service', 'User', 'Browser', 'Request rejected', 'Our service rejects a request whose state does not match. If it did not verify this, the victim would end up logged in to the attacker\'s account, and the information the victim enters afterward would pile up in the attacker\'s account.', 'good');
        res = 'Rejected (forged request blocked)'; sum.push('state is a value that checks "is this the response to a request I started?" It protects against CSRF aimed at the login process.');
      } else {
        step('Kakao authorization server', 'Our service', 'Browser redirect', 'code=Aq7Lp, state=x9f2', 'Kakao redirects the browser back to the redirect_uri of our service and attaches the authorization code. This code is a very short-lived, single-use code that can be exchanged for a token. It passes through the browser address bar, so it is designed on the assumption that it can be exposed.', '');
        step('Our service', 'Our service', 'Inside the server', 'state comparison: x9f2 = x9f2', 'Our server compares the returned state with the value it remembered in the session. They are the same, so it continues.', 'good');
        step('Our service', 'Kakao authorization server', 'Direct server-to-server', 'code=Aq7Lp + client_secret', 'Our server sends a request directly to the token endpoint of Kakao. Along with the authorization code, it sends the client_secret, which only our server knows. This communication does not go through the browser.', '');
        step('Kakao authorization server', 'Our service', 'Direct server-to-server', 'Access token (+ refresh token)', 'Kakao checks the code and the secret and issues an access token. The token is not exposed to the browser and is delivered only to our server. The authorization code is discarded at this moment.', 'good');
        if (c.sc === 'reuse') {
          step('Attacker', 'Kakao authorization server', 'Direct request', 'code=Aq7Lp (intercepted code, no client_secret)', 'The attacker obtains the authorization code from the browser history or a log and tries to exchange it for a token. The attacker does not know the client_secret, so it sends only the code.', '');
          step('Kakao authorization server', 'Attacker', 'Response', 'error=invalid_client', 'It is rejected. In the standard (RFC 6749), the token endpoint checks whether the requester is a registered client (the client_secret), and if this check fails, it returns the invalid_client error. Even if the attacker had found out the secret, this code has already been used, so the request would be rejected with the invalid_grant error. An authorization code alone cannot get a token.', 'good');
        }
        step('Our service', 'Kakao API server', 'Direct server-to-server', 'Authorization: Bearer (access token)', 'Our server calls the user information API of Kakao with the access token. It can receive only the information in the scope that the token allows.', '');
        step('Kakao API server', 'Our service', 'Direct server-to-server', 'Kakao member number, nickname, email', 'The user information has been received. Our service uses the Kakao member number to find our member or to register a new one.', 'good');
        step('Our service', 'User', 'Browser', 'Our own session cookie or JWT', 'Finally, our service does its own login processing. Later requests are authenticated with the session or token of our service, independent of Kakao.', 'good');
        res = c.sc === 'reuse' ? 'Login succeeded (the attacker\'s reuse of the code was rejected)' : 'Login succeeded'; got = 'Access token, user information';
        sum.push('The authorization code arrives through the browser, while the token is exchanged directly between servers. The structure lets only a value that is useless by itself (the code) travel on the path that is easy to expose.');
        if (c.sc === 'reuse') sum.push('An authorization code can be used only once and has a short lifetime, and exchanging it for a token requires the client_secret that only the server knows. Mobile apps and SPAs, which cannot keep a secret, use a supplementary procedure called PKCE.');
      }
    }
    sum.push('OAuth 2.0 is, at its core, a procedure for being delegated permission (authorization). When it is used for login (authentication), the received token is used to look up user information and confirm who the user is, and OpenID Connect standardizes this.');
    return { events: ev, summary: sum, row: [res, got, 'Kakao only'] };
  },
  render: function (v, sim, t, H, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [];
    if (rows.length) H.table(v, ['From → to', 'Path', 'What was passed'], rows, 'Order of exchanges'); else H.text(v, 'Click Run to start.');
    H.text(v, '"Browser redirect" is a path that goes through the address bar of the user\'s browser, and "Direct server-to-server" is a path that the browser cannot see.');
  },
  // Diagram: the order of exchanges among the user, our service, and the two servers of Kakao. The password goes only to Kakao.
  draw: function (P, sim, shown) {
    var last = shown[shown.length - 1], rows = last ? last.snap.rows : [], ids = { 'User': 'u', 'Our service': 'w', 'Kakao authorization server': 'k', 'Kakao API server': 'a' };
    var msgs = rows.map(function (r) { var m = P.dir(P.v(r.cells[0]), ids); m.s = P.v(r.cells[2]); m.cls = P.c(r.cells[2]); return m; });
    var end = P.seq([['u', 'User (browser)', 'wait'], ['w', 'Our service', 'wait'], ['k', 'Kakao auth server', 'plain'], ['a', 'Kakao API server', 'plain']], msgs, { keep: 8 });
    P.size(680, end + 16);
    P.note('All the arrows look alike, but the authorization code and state travel through the address bar of the browser (the redirect), and only the token exchange goes directly between servers. Long text may look cut off, so check the full content and the path in the table on the right.');
  },
  assume: 'The authorization code grant of OAuth 2.0 is transcribed following the flow in the standard document (RFC 6749). Kakao is only an example, and other providers such as Google and Naver have the same flow. The code and token values are fake values for explanation.',
});
