import { Component, input } from '@angular/core';
import { MatchSnippet } from '../../services/fuse-service/search-text';

@Component({
  selector: 'app-match-highlight',
  template: `{{ snippet().before }}<mark>{{ snippet().match }}</mark
    >{{ snippet().after }}`,
  styles: `
    mark {
      padding: 0 1px;
      color: #000;
      background-color: #ffe27a;
      border-radius: 2px;
    }
  `,
})
export class MatchHighlightComponent {
  readonly snippet = input.required<MatchSnippet>();
}
