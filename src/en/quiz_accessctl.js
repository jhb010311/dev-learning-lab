// Quiz questions for the "Access control" lab. The first entry of a is the correct answer. When sim is present, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'accessctl', q: 'To stop a logged-in user from changing the order number in the URL to request another person\'s order, what must the server do?',
    a: ['Compare, in server code, the owner of the order that was looked up with the user who is logged in now', 'Check once more in a filter that the request carries login information', 'Hide the links to other people\'s orders on the screen', 'Add a rule that the order lookup URL requires the USER role'],
    why: 'Being logged in only means that who you are has been confirmed, not that you may view that order. A login check or a role rule does not know whose order it is, and hiding a link on the screen does not help, because typing the URL directly still sends the request. The server must compare the owner of the order with the logged-in user.' },
  { lv: 2, id: 'accessctl', q: 'On a server where only a hasRole("USER") rule is placed on the order lookup URL, why can kim, who is USER, see lee\'s order by changing just the number?',
    a: ['A role only says what kind of user someone is, and does not compare whose order it is', 'The hasRole rule works only on admin URLs and is ignored on order URLs', 'If kim and lee have the same role, the server logs the two in as the same user', 'A role rule blocks only users who are not logged in and does not check logged-in users'],
    why: 'kim and lee are both USER, so a role rule cannot tell them apart. A condition such as "only your own" can be decided only by looking up the order and then comparing the owner of the order with the logged-in user.' },
  { lv: 3, id: 'accessctl', q: 'The server checks only that the user is logged in. kim, the owner of order 1, logs in and sends GET /orders/2 (lee\'s order). What is the response?',
    a: ['200 OK, with the contents of lee\'s order', '403 Forbidden', '404 Not Found', '401 Unauthorized'],
    why: 'kim is logged in, so the request passes the rule "is logged in". If the controller does not check the owner of the order, it returns the order it looked up as it is, so lee\'s order becomes visible.',
    sim: { c: { check: 'login', who: 'kim', target: '2' }, col: 0, has: '200' } },
  { lv: 3, id: 'accessctl', q: 'The server looks up only an order where both the number and the owner match, and answers 404 if there is none. kim requests lee\'s order (order 2) and then an order that does not exist (order 99). What are the responses?',
    a: ['Both are 404, so it cannot be known whether order 2 exists', 'Order 2 gets 403 and order 99 gets 404, so they differ', 'Order 2 gets 200 and order 99 gets 404, so they differ', 'Both are 403, so it looks like a permission problem for kim'],
    why: 'If the server looks only among my own orders, another person\'s order and an order that does not exist both end up as "not found". The responses are the same, so the requester cannot know whether an order with that number really exists. A server that answers 403 when the user is not the owner would let you compare against 404 and find out which numbers exist.',
    sim: { c: { check: 'owner404', who: 'kim', target: '2' }, col: 0, has: '404' } },
]);
