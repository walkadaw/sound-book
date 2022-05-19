import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GeneratorService {
  getDocX(songs: number[], options: any): void {
    const form = document.createElement('form');
    form.setAttribute('action', `${environment.baseUrl}/generator/docx`);
    form.setAttribute('method', 'POST');
    form.setAttribute('target', '_blank');

    const songInput = document.createElement('input');
    songInput.setAttribute('type', 'text');
    songInput.setAttribute('name', 'songs');
    songInput.setAttribute('value', JSON.stringify(songs));

    form.appendChild(songInput);

    const optionsInput = document.createElement('input');
    optionsInput.setAttribute('type', 'text');
    optionsInput.setAttribute('name', 'options');
    optionsInput.setAttribute('value', JSON.stringify(options));

    form.appendChild(optionsInput);

    document.body.appendChild(form);
    form.submit();
    form.remove();
  }
}
