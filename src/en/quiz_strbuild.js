// Quiz questions for the "String, StringBuilder" lab. The first entry of a is the correct answer, and when there is a sim, the answer is checked against the result of the lab model.
Lab.quiz([
  { lv: 1, id: 'strbuild', q: 'String s = "java"; On the next line, the code only calls s.toUpperCase(); and ignores the return value. What is printed when s is printed after that?',
    a: ['java', 'JAVA', 'Java', 'null'],
    why: 'A String is an object whose contents do not change. toUpperCase() does not modify the original. It returns a new string, "JAVA", but the return value was ignored, so s still refers to the first object.',
    sim: { c: { type: 'str', op: 'drop', m: 'upper' }, col: 0, has: 'java' } },
  { lv: 2, id: 'strbuild', q: 'String first = s; makes first refer to the same object, and then s = s.concat("!"); is executed. Why does printing first still show java?',
    a: ['Because concat does not modify the original object and returns a new string object', 'Because the whole string is copied and stored separately when it is assigned to first', 'Because concat modifies the original object and then restores only first to the previous contents', 'Because a string literal can be held only in a final variable and so does not change'],
    why: 'first = s does not copy the contents. It only makes first refer to the same object. concat does not modify that object and returns a new one, so only s moves to the new object, and the first object that first refers to stays as it was.',
    sim: { c: { type: 'str', op: 'assign', m: 'concat' }, col: 1, has: 'java' } },
  { lv: 3, id: 'strbuild', q: 'StringBuilder first = sb; remembers the object, and then sb.append(i) is called three times in a loop. Which is correct about the result of sb == first and about what printing first shows?',
    a: ['It is true, and printing first also shows the appended contents', 'It is true, but printing first shows only the original contents', 'It is false, and printing first shows only the original contents', 'It is false, but printing first also shows the appended contents'],
    why: 'The append method of StringBuilder does not create a new object. It modifies the contents of the same object. sb and first refer to the same object to the end, so == is true, and the changed contents are visible through first as well.',
    sim: { c: { type: 'sb', op: 'loop', m: 'upper' }, col: 2, has: 'Same object' } },
  { lv: 3, id: 'strbuild', q: 'Starting from String s = "java";, a loop executes s = s + i; three times. Each time, the s just before the statement and the s after it are compared with !=, and changed is increased by 1 if they are different. What does changed become?',
    a: ['3', '0', '1', '2'],
    why: 'The contents of a String cannot be modified, so every concatenation with + creates a new string object, and s comes to refer to that object. All three times the object is different from the previous one, so changed is 3.',
    sim: { c: { type: 'str', op: 'loop', m: 'upper' }, col: 3, has: '3' } },
]);
