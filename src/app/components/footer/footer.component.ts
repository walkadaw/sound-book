import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

interface JesusSay {
  content: string,
  alias: string
}

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterComponent implements OnInit, OnDestroy{
  words!: JesusSay | null;

  private listWords: JesusSay[] = [
    {
      content: 'Заповедь новую даю вам, да любите друг друга; как Я возлюбил вас, так и вы да любите друг друга.',
      alias: 'Иоанна 13:34'
    },
    {
      content: 'Радуйтесь всегда в Господе; и еще говорю: радуйтесь.',
      alias: 'Филиппийцам 4:4'
    },
    {
      content: 'И когда стоите на молитве, прощайте, если что имеете на кого, дабы и Отец ваш Небесный простил вам согрешения ваши.',
      alias: 'Марка 11:25'
    },
    {
      content: 'Просите и воздастся вам, ищите и найдёте. Стучитесь и дверь отворится перед вами. Кто просит, получит; кто ищет, всегда найдёт; и откроется дверь перед тем, кто стучится',
      alias: 'Матфея 7:7-8'
    },
    {
      content: 'Воззови ко Мне — и Я отвечу тебе, покажу тебе великое и недоступное, чего ты не знаешь.',
      alias: 'Иеремия 33:2'
    },
    {
      content: 'Утешайся Господом, и Он исполнит желание сердца твоего.',
      alias: 'Псалом 37:4'
    },
    {
      content: 'И сказал им Ангел: не бойтесь; я возвещаю вам великую радость, которая будет всем людям.',
      alias: 'Луки 2:10'
    },
    {
      content: 'Свидетельство сие состоит в том, что Бог даровал нам жизнь вечную, и сия жизнь — в Сыне Его.',
      alias: '1 Иоанна 5:11'
    },
    {
      content: 'Я свет миру; кто последует за Мною, тот не будет ходить во тьме, но будет иметь свет жизни.',
      alias: 'Иоанна 8:12'
    },
    {
      content: 'Ибо Я Господь, Бог твой; держу тебя за правую руку твою, говорю тебе: "не бойся, Я помогаю тебе".',
      alias: 'Исаия 41:13'
    },
    {
      content: 'И прежде всего любите друг друга от всей души, потому что любовь покрывает множество грехов.',
      alias: '1 Петра 4:8'
    },
    {
      content: 'Радуйтесь с радующимися и плачьте с плачущими.',
      alias: 'Римлянам 12:15'
    },
  ];

  private onDestroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.router.events.pipe(
      filter(data => data instanceof NavigationEnd),
      takeUntil(this.onDestroy$),
    ).subscribe(() => {
      this.close();
    });
  }

  ngOnDestroy() {
    this.onDestroy$.next();
    this.onDestroy$.complete();
  }

  onClick() {
    const rand = Math.floor(Math.random() * this.listWords.length);
    this.words = this.listWords[rand];
  }

  close() {
    this.words = null;
    this.cdr.markForCheck();
  }
}
