// Reads the screen the way a person does: "48 free right now" is one reading, whether the number and its words sit in
// one piece of text or in two. reading(...parts) matches the smallest part of the page where the parts follow one
// another, in the order the ticket reads them, as whole words with nothing else between them ("48", "lockers" reads
// "48 lockers"). A RegExp part is tried on the words of the part found by the others.
const words = (node) => {
  const out = [];
  const walk = (n) => {
    if (n.nodeType === 3) {
      const t = n.textContent.replace(/\s+/g, ' ').trim();
      if (t) out.push(t);
    } else if (n.nodeType === 1 && !['SCRIPT', 'STYLE'].includes(n.tagName)) {
      n.childNodes.forEach(walk);
    }
  };
  walk(node);
  return out;
};

// Spaces are not compared: "20/20 free" reads the same whether it is one piece of text or "20", "/", "20" and " free".
const bare = (text) => text.replace(/\s+/g, '');

const hasRun = (pieces, phrase) => {
  const target = bare(phrase);
  for (let i = 0; i < pieces.length; i += 1) {
    let acc = '';
    for (let j = i; j < pieces.length; j += 1) {
      acc += bare(pieces[j]);
      if (acc === target) return true;
      if (acc.length >= target.length) break;
    }
  }
  return false;
};

const holdsAll = (element, parts) => {
  const pieces = words(element);
  const text = pieces.join(' ');
  const phrases = parts.filter((p) => !(p instanceof RegExp));
  const patterns = parts.filter((p) => p instanceof RegExp);
  const together = phrases.length === 0 || hasRun(pieces, phrases.join(' '));
  return together && patterns.every((p) => p.test(text));
};

export function reading(...parts) {
  return (_content, element) =>
    holdsAll(element, parts) && ![...element.children].some((child) => holdsAll(child, parts));
}

/** The words of one part of the page, as a person reads them, with single spaces. */
export function wordsOf(element) {
  return words(element).join(' ');
}

/** Every word on the page, as a person reads it: to see that an action changed nothing else on the screen. */
export function pageWords() {
  return words(document.body).join(' ');
}
