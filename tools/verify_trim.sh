#!/bin/sh
# 되풀이 줄이기 작업이 끝난 실습들을 다시 확인한다: 사실 내용이 그대로인지, 두 언어판이 돌아가는지, 두 언어가 맞는지.
# 사용: sh tools/verify_trim.sh <id> [<id> ...]
for id in "$@"; do
  a=$(node tools/check_trim.js $id 2>&1 | head -1 | cut -c1-110)
  b=$(node test.js $id 2>&1 | grep -ciE "실패|오류|fail|error")
  c=$(LAB_LANG=en node test.js $id 2>&1 | grep -ciE "실패|오류|fail|error")
  d=$(node tools/i18n/check_en.js $id 2>&1 | tail -1)
  echo "$a | 테스트 ko:$b en:$c | $d"
done
