import { ErrorHandler, Injectable } from '@angular/core';
import { Action } from '@ngrx/store';
import { Notification, Observable, Subject } from 'rxjs';
import {
  dematerialize,
  exhaustMap,
  filter,
  groupBy,
  map,
  mergeMap,
} from 'rxjs/operators';

import { verifyOutput } from './effect_notification';
import { resolveEffectSource } from './effects_resolver';
import { getSourceForInstance } from './effects_metadata';

@Injectable()
export class EffectSources extends Subject<{
  identifier: any;
  effectSourceInstance: any;
}> {
  constructor(private errorHandler: ErrorHandler) {
    super();
  }

  addEffects(
    effectSourceInstance: any,
    identifier: any = getSourceForInstance(effectSourceInstance)
  ) {
    this.next({ identifier, effectSourceInstance });
  }

  /**
   * @internal
   */
  toActions(): Observable<Action> {
    return this.pipe(
      groupBy(source => source.identifier),
      mergeMap(source$ =>
        source$.pipe(
          exhaustMap(source =>
            resolveEffectSource(source.effectSourceInstance)
          ),
          map(output => {
            verifyOutput(output, this.errorHandler);

            return output.notification;
          }),
          filter(
            (notification): notification is Notification<Action> =>
              notification.kind === 'N'
          ),
          dematerialize()
        )
      )
    );
  }
}
