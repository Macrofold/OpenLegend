import type { ActorResponse, ResponseOperation } from '@open-legend/domain';

/** Use the ordinary response/receipt owner for both UI and native actor choices. */
export function actionResponse(act: NonNullable<ResponseOperation['act']>): ActorResponse {
  return {
    operations: [
      {
        note: null,
        name: null,
        localId: 'action',
        requiresAccepted: [],
        talk: null,
        think: null,
        goal: null,
        plan: null,
        // The decision schema requires every act field; absent references are explicit nulls.
        act: { ...act, invocation: act.invocation ?? null, slots: act.slots ?? null },
      },
    ],
  };
}
