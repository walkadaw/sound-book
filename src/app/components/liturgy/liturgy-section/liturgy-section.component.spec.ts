import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiturgySection } from '../../../interfaces/liturgy';
import { LiturgySectionComponent } from './liturgy-section.component';

describe('LiturgySectionComponent', () => {
  let fixture: ComponentFixture<LiturgySectionComponent>;

  const render = async (section: LiturgySection) => {
    fixture = TestBed.createComponent(LiturgySectionComponent);
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
  };
  const paragraphs = () => [...fixture.nativeElement.querySelectorAll('p')] as HTMLElement[];

  it('should show the heading, the reference and each block as a paragraph', async () => {
    await render({
      type: 'reading',
      title: 'ПЕРШАЕ ЧЫТАННЕ',
      reference: 'Эф 3, 2–12',
      blocks: [
        { kind: 'subtitle', lines: ['Таямніца Хрыста аб’явілася цяпер'] },
        { kind: 'intro', lines: ['Чытанне Паслання святога апостала Паўла да Эфесцаў.'] },
        { kind: 'text', lines: ['Браты:', 'Калі вы чулі <b>пра</b> ўдзяленне ласкі'] },
        { kind: 'conclusion', lines: ['Гэта слова Божае.'] },
      ],
    });

    expect(fixture.nativeElement.querySelector('h2').textContent).toBe('ПЕРШАЕ ЧЫТАННЕ');
    expect(paragraphs().map((p) => p.className)).toEqual(['meta reference', 'subtitle', 'intro', 'text', 'conclusion']);
    expect(paragraphs()[3].innerHTML).toBe('Браты:<br>Калі вы чулі <b>пра</b> ўдзяленне ласкі');
  });

  it('should label the refrain and the acclamation and show rubrics as secondary text', async () => {
    await render({
      type: 'psalm',
      title: 'РЭСПАНСАРЫЙНЫ ПСАЛЬМ',
      reference: '',
      blocks: [
        { kind: 'refrain', lines: ['Вось дзень, які Пан учыніў', '<b>Або:</b> Аллелюя.'] },
        { kind: 'acclamation', lines: ['Аллелюя, аллелюя, аллелюя.'] },
        { kind: 'rubric', lines: ['Чытаецца калекта'] },
      ],
    });

    expect(paragraphs().map((p) => p.textContent)).toEqual([
      'Рэфрэн: Вось дзень, які Пан учыніўАбо: Аллелюя.',
      'Акламацыя: Аллелюя, аллелюя, аллелюя.',
      'Чытаецца калекта',
    ]);
    expect(paragraphs()[2].className).toBe('meta');
  });});
