import { LiturgyBlock, LiturgySection, LiturgySectionType } from '../../interfaces/liturgy';
import { liturgySlides, SlideMeasure } from './liturgy-slides';

// Every line of the slide holds `width` characters, and a slide holds `maxLines` lines.
const measure = (width: number, maxLines: number): SlideMeasure => ({
  lines: (text) => text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / width)), 0),
  maxLines: () => maxLines,
});
const roomy = measure(1000, 100);

const section = (type: LiturgySectionType, blocks: LiturgyBlock[]): LiturgySection => ({
  type,
  title: type.toUpperCase(),
  reference: '',
  blocks,
  alternatives: [],
});
const texts = (sections: LiturgySection[], slideMeasure = roomy) =>
  liturgySlides('l', sections, slideMeasure).map(({ slides }) => slides.map(({ text }) => text));

describe('liturgySlides', () => {
  it('should make a list per section in the order of the liturgy', () => {
    const lists = liturgySlides(
      'l2',
      [
        section('procession', [{ kind: 'text', lines: ['Гасанна.'] }]),
        section('reading', [{ kind: 'text', lines: ['Браты.'] }]),
        section('sequence', [{ kind: 'text', lines: ['Ў радаснае свята'] }]),
      ],
      roomy,
    );

    expect(lists.map(({ id, title, liturgy }) => ({ id, title, liturgy }))).toEqual([
      { id: 'l2-0', title: 'PROCESSION', liturgy: 'l2' },
      { id: 'l2-1', title: 'READING', liturgy: 'l2' },
      { id: 'l2-2', title: 'SEQUENCE', liturgy: 'l2' },
    ]);
    expect(lists[1].slides).toEqual([{ fontSize: 54, text: 'Браты.' }]);
    expect(lists[2].slides).toEqual([{ fontSize: 50, text: 'Ў радаснае свята' }]);
  });

  it('should leave out what is not read aloud', () => {
    const reading = section('reading', [
      { kind: 'subtitle', lines: ['Падзагаловак'] },
      { kind: 'intro', lines: ['Чытанне кнігі.'] },
      { kind: 'rubric', lines: ['Указанне.'] },
      { kind: 'text', lines: ['Браты, <b>радуйцеся</b> &amp; <i>спявайце</i>.'] },
      { kind: 'conclusion', lines: ['Слова Божае.'] },
    ]);

    expect(texts([reading])).toEqual([['Браты, радуйцеся & спявайце. Слова Божае.']]);
  });

  it('should give a text read instead a list right after it and name both with their references', () => {
    const reading = {
      ...section('reading', [{ kind: 'text', lines: ['Браты.'] }]),
      reference: 'Эф 1, 3–6',
      alternatives: [{ reference: 'Гал 4, 4–7', blocks: [{ kind: 'text' as const, lines: ['Калі надышла.'] }] }],
    };
    const gospel = { ...section('gospel', [{ kind: 'text', lines: ['У той час.'] }]), reference: 'Лк 1, 39–47' };
    const lists = liturgySlides('l', [reading, gospel], roomy);

    expect(lists.map(({ id, title, liturgy }) => ({ id, title, liturgy }))).toEqual([
      { id: 'l-0', title: 'READING (Эф 1, 3–6)', liturgy: 'l' },
      { id: 'l-0-1', title: 'READING (Гал 4, 4–7)', liturgy: 'l' },
      { id: 'l-1', title: 'GOSPEL', liturgy: 'l' },
    ]);
    expect(lists[1].slides).toEqual([{ fontSize: 54, text: 'Калі надышла.' }]);
  });

  it('should show both refrains on every refrain slide of a psalm that offers two', () => {
    const psalm = {
      ...section('psalm', [
        { kind: 'refrain', lines: ['Пан мой пастыр.', '<b>Або:</b> Аллелюя.'] },
        { kind: 'text', lines: ['1. Пан мой пастыр, *', 'нічога мне не бракуе.'] },
        { kind: 'refrain', lines: ['Пан мой пастыр.'] },
      ]),
      reference: 'Пс 23 (22), 1',
    };
    const lists = liturgySlides('l', [psalm], measure(1000, 3));

    expect(lists.map(({ id, title }) => ({ id, title }))).toEqual([{ id: 'l-0', title: 'PSALM' }]);
    expect(lists[0].slides.map(({ text }) => text)).toEqual([
      'Пан мой пастыр.\nАбо: Аллелюя.',
      'Пан мой пастыр, *\nнічога мне не бракуе.',
      'Пан мой пастыр.\nАбо: Аллелюя.',
    ]);
  });

  it('should give no list to a section with nothing read aloud', () => {
    const rubricOnly = section('reading', [{ kind: 'rubric', lines: ['Указанне.'] }]);
    const reading = section('reading', [{ kind: 'text', lines: ['Браты.'] }]);

    expect(liturgySlides('l', [rubricOnly, reading], roomy).map(({ id }) => id)).toEqual(['l-1']);
  });

  it('should end a phrase after a closing quote and before a no-break space', () => {
    const reading = section('reading', [
      { kind: 'text', lines: ['Ён сказаў: «Ідзі.» Яна&nbsp;пайшла,&nbsp;плачучы.'] },
    ]);

    expect(texts([reading], measure(16, 1))).toEqual([['Ён сказаў:', '«Ідзі.»', 'Яна пайшла,', 'плачучы.']]);
  });

  it('should give a word longer than a slide a slide of its own', () => {
    const reading = section('reading', [{ kind: 'text', lines: ['Так, Найсвяцейшая'] }]);

    expect(texts([reading], measure(5, 1))).toEqual([['Так,', 'Найсвяцейшая']]);
  });

  it('should fill a reading slide with whole phrases', () => {
    const reading = section('reading', [{ kind: 'text', lines: ['Першая фраза, другая фраза. Трэцяя фраза!'] }]);

    expect(texts([reading], measure(30, 1))).toEqual([['Першая фраза, другая фраза.', 'Трэцяя фраза!']]);
  });

  it('should split a long phrase between words on a mostly empty slide', () => {
    const reading = section('reading', [{ kind: 'text', lines: ['Адно, вельмі доўгая фраза без знакаў прыпынку'] }]);

    expect(texts([reading], measure(10, 3))).toEqual([['Адно, вельмі доўгая фраза без', 'знакаў прыпынку']]);
  });

  it('should keep hyphenated words and the Passion speaker marks with the words after them', () => {
    const gospel = section('gospel', [
      { kind: 'text', lines: ['Сказаў з-за дзвярэй: <b>І.</b> Ты Кароль? <b>Ев.</b> Ён адказаў.'] },
    ]);

    expect(texts([gospel], measure(24, 1))).toEqual([
      ['Сказаў з-за дзвярэй:', 'І.\u00a0Ты Кароль?', 'Ев.\u00a0Ён адказаў.'],
    ]);
  });

  it('should put the refrain and one stanza on each psalm slide and end with the refrain', () => {
    const psalm = section('psalm', [
      { kind: 'refrain', lines: ['Пан мой пастыр.'] },
      { kind: 'text', lines: ['1. Пан мой пастыр, *', 'нічога мне не бракуе.'] },
      { kind: 'refrain', lines: ['Пан мой пастыр.'] },
      { kind: 'text', lines: ['2. Ён вядзе мяне *', 'на зялёныя пашы.'] },
      { kind: 'refrain', lines: ['Пан мой пастыр.'] },
    ]);

    expect(texts([psalm])).toEqual([
      [
        'Пан мой пастыр.\n\nПан мой пастыр, *\nнічога мне не бракуе.',
        'Пан мой пастыр.\n\nЁн вядзе мяне *\nна зялёныя пашы.',
        'Пан мой пастыр.',
      ],
    ]);
  });

  it('should give the refrain and the stanza a slide each when they do not fit on one', () => {
    const refrain = { kind: 'refrain' as const, lines: ['Пан мой пастыр.', '<b>Або:</b> Аллелюя.'] };
    const psalm = section('psalm', [
      refrain,
      { kind: 'text', lines: ['1. Пан мой пастыр, *', 'нічога мне не бракуе.', 'Ён вядзе мяне.'] },
      refrain,
      { kind: 'text', lines: ['2. Адзін *', 'два', 'тры', 'чатыры', 'пяць', 'шэсць'] },
      refrain,
    ]);

    // four lines a slide: the two refrains and a blank line leave no room for a stanza of three
    expect(texts([psalm], measure(1000, 4))).toEqual([
      [
        'Пан мой пастыр.\nАбо: Аллелюя.',
        'Пан мой пастыр, *\nнічога мне не бракуе.\nЁн вядзе мяне.',
        'Пан мой пастыр.\nАбо: Аллелюя.',
        'Адзін *\nдва\nтры\nчатыры',
        'пяць\nшэсць',
        'Пан мой пастыр.\nАбо: Аллелюя.',
      ],
    ]);
  });

  it('should trim the marks off the acclamation', () => {
    const acclamation = section('acclamation', [
      { kind: 'acclamation', lines: ['Аллелюя, аллелюя, аллелюя.'] },
      { kind: 'text', lines: ['Чувайце і будзьце гатовыя,', 'бо Сын Чалавечы прыйдзе. *'] },
      { kind: 'acclamation', lines: ['Аллелюя, аллелюя, аллелюя.'] },
    ]);

    expect(texts([acclamation])).toEqual([
      ['Аллелюя, аллелюя, аллелюя\n\nЧувайце і будзьце гатовыя,\nбо Сын Чалавечы прыйдзе\n\nАллелюя, аллелюя, аллелюя'],
    ]);
  });

  it('should put two couplets of the sequence on a slide', () => {
    const couplet = (n: number) => ({ kind: 'text' as const, lines: [`Радок ${n}а`, `Радок ${n}б`] });
    const sequence = section('sequence', [couplet(1), couplet(2), couplet(3)]);

    expect(texts([sequence])).toEqual([['Радок 1а\nРадок 1б\n\nРадок 2а\nРадок 2б', 'Радок 3а\nРадок 3б']]);
  });

  it('should start a new slide before a stanza that does not fit', () => {
    const psalm = section('psalm', [
      { kind: 'refrain', lines: ['Рэфрэн'] },
      { kind: 'text', lines: ['Радок 1', 'Радок 2'] },
    ]);

    expect(texts([psalm], measure(100, 3))).toEqual([['Рэфрэн', 'Радок 1\nРадок 2']]);
  });

  it('should split a stanza longer than a slide between lines', () => {
    const psalm = section('psalm', [{ kind: 'text', lines: ['Радок 1', 'Радок 2', 'Радок 3', 'Радок 4', 'Радок 5'] }]);

    expect(texts([psalm], measure(100, 2))).toEqual([['Радок 1\nРадок 2', 'Радок 3\nРадок 4', 'Радок 5']]);
  });
});
