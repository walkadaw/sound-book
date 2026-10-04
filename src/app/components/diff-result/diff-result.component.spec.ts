import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiffResultComponent } from './diff-result.component';

describe('DiffResultComponent', () => {
  let fixture: ComponentFixture<DiffResultComponent>;

  const show = async (before: string, after: string) => {
    fixture.componentRef.setInput('before', before);
    fixture.componentRef.setInput('after', after);
    await fixture.whenStable();
  };
  const text = (selector: string) =>
    [...fixture.nativeElement.querySelectorAll(selector)].map((element: HTMLElement) => element.textContent.trim());

  beforeEach(() => {
    fixture = TestBed.createComponent(DiffResultComponent);
  });

  it('should say when the texts are the same', async () => {
    await show('a\nb', 'a\r\nb');

    expect(text('.diff__summary')).toEqual(['Без змен']);
    expect(text('.diff__line')).toEqual([]);
  });

  it('should mark changed words and name the kind of every changed line for screen readers', async () => {
    await show('Снова вечер', 'Снова утро');

    expect(text('del')).toEqual(['вечер']);
    expect(text('ins')).toEqual(['утро']);
    expect(text('.diff__line--removed .cdk-visually-hidden')).toEqual(['Выдалена:']);
    expect(text('.diff__line--added .cdk-visually-hidden')).toEqual(['Дададзена:']);
  });

  it('should keep the spacing of the song in the line text', async () => {
    await show('Am    G\nx', 'Am    G\ny');

    expect(fixture.nativeElement.querySelector('.diff__line--same .diff__text').textContent).toBe('Am    G');
  });

  it('should open collapsed unchanged lines on click', async () => {
    await show('1\n2\n3\n4\n5\n6', '1\n2\n3\n4\n5\nsix');

    const expand = fixture.nativeElement.querySelector('.diff__expand') as HTMLButtonElement;
    expect(expand.textContent).toContain('3');

    expand.click();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.diff__expand')).toBeNull();
    expect(text('.diff__line--same .diff__text')).toEqual(['1', '2', '3', '4', '5']);
  });
});
