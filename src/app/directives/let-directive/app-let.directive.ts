import { Directive, Inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';

export interface IContextWithImplicit<T> {
  $implicit: T;
}

export class LetContext<T> implements IContextWithImplicit<T> {
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
})
export class LetDirective<T> {
  @Input()
  appLet: T;

  constructor(
    @Inject(ViewContainerRef) viewContainer: ViewContainerRef,
    @Inject(TemplateRef) templateRef: TemplateRef<LetContext<T>>
  ) {
    viewContainer.createEmbeddedView(templateRef, new LetContext<T>(this));
  }
}
