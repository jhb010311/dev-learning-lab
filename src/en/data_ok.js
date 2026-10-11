// 영어판에서 한국어판과 달라도 되는 값. 실습 id마다 [한국어판의 값, 영어판의 값]을 적는다.
// 메시지 글자가 달라지면 값도 달라지는 것(해시, 암호문, 서명)만 여기에 둔다. 검사 도구(tools/i18n/check_en.js)가 이 표로 바꾼 뒤 비교한다.
module.exports = {
  // "주문 100원" → "Order 100 won". 영어판의 값은 verify/crypto_en_probe.js로 계산했다(결과: verify/crypto_en_probe.out.json).
  crypto: [
    ['d262c5de4c7e878debde9ca793209ecf6ed055bede1b021f298f05dee15d9071', '61f18f18afa3952402e0636904f28f39d8f4d6f0039f981d653dc97ec51ec10e'],
    ['183b226fc6f1393a5716b07ae1f7aa52d1527f69c83a5b9898de63ae8d362396', '5b741fe8fa44f42905aa1ae1fe2d3365344c69d000b16c1a4981891d16945c44'],
    ['376ab1de11a014258a13186347', '94bb6950cf3805248a038397b9'],
    ['863cd521da711cdb8380126b48e49dd3', '5f398a6b908d7f5c16625512aa635838'],
    ['b5efce470986677f38c0dfabf8b0a3b662000538d1335eca9146c3ddb736029d', '81f0583e32233d7bac91d36b2f7365bdaa3a990cc2fe8b66eabc7d63deb89a90'],
    ['a8f856a3dba36a039c50d4dc0cdada50', 'ef2985c80f2dbf73f615931fed54e2ae'],
  ],
};
