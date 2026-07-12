// eslint-disable-next-line max-classes-per-file
import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';

export interface IContextWithImplicit<T> {
  $implicit: T;
}

export class LetContext<T> implements IContextWithImplicit<T> {
  // eslint-disable-next-line no-use-before-define
  constructor(private readonly internalDirectiveInstance: LetDirective<T>) {}

  get $implicit(): T {
    return this.internalDirectiveInstance.appLet;
  }

  get appLet(): T {
    return this.internalDirectiveInstance.appLet;
  }
}

/**
 * Works like *ngIf but does not have a condition — use it to declare the result of pipes calculation (i.e. async pipe)
 */
@Directive({
    selector: '[appLet]',
    standalone: true,
})
export class LetDirective<T> {
  @Input()
    appLet: T;

  constructor() {
    const viewContainer = inject<ViewContainerRef>(ViewContainerRef);
    const templateRef = inject<TemplateRef<LetContext<T>>>(TemplateRef);

    viewContainer.createEmbeddedView(templateRef, new LetContext<T>(this));
  }
}
