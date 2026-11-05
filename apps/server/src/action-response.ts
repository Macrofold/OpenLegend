import type { ActorResponse, ResponseOperation } from '@open-legend/domain';

/** Use the ordinary response/receipt owner for both UI and native actor choices. */
export function actionResponse(act: NonNullable<ResponseOperation['act']>): ActorResponse {
  return {
    operations: [
      {
        localId: 'action',
        requiresAccepted: [],
        // Genuine unspecified action references retain their meaningful null values.
        act: { ...act, invocation: act.invocation ?? null, slots: act.slots ?? null },
      },
    ],
  };
}
