// "REST API와 메시지 컨버터" 실습에 필요한 용어
module.exports = [
  ['웹·네트워크', '콘텐츠 협상(Accept와 Content-Type)', '클라이언트와 서버가 본문을 어떤 형식으로 주고받을지 헤더로 맞추는 일이다. Content-Type 헤더는 지금 보내는 본문의 형식을, Accept 헤더는 받고 싶은 응답의 형식을 알려 주며, 값은 application/json이나 text/html 같은 미디어 타입으로 적는다. 서버가 요청 본문의 형식을 읽지 못하면 415(Unsupported Media Type)로, 원하는 형식의 응답을 만들지 못하면 406(Not Acceptable)으로 응답한다. 스프링은 본문의 내용을 보고 형식을 짐작하지 않고 Content-Type 헤더를 따르므로, JSON을 보내면서 Content-Type을 다르게 적으면 읽지 못한다.'],
  ['Spring', 'ResponseEntity', '응답의 상태 코드와 헤더, 본문을 한꺼번에 담아 컨트롤러가 돌려주는 객체다. 객체만 돌려주면 상태 코드는 200으로 정해지지만, ResponseEntity.status(201).body(객체)나 ResponseEntity.created(주소).body(객체)처럼 쓰면 상태 코드와 헤더를 컨트롤러가 직접 정할 수 있다. 본문으로 담은 객체는 그냥 돌려줄 때와 똑같이 메시지 컨버터가 JSON 등으로 바꾼다. 경우에 따라 다른 상태 코드를 돌려줘야 하는 메서드나 @ExceptionHandler에서 주로 쓴다.'],
];
