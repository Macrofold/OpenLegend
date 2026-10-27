import { validateSocialOfferPolicy } from '../../social-offer-policy.js';
import offers from './config/social-offers.generated.json' with { type: 'json' };
validateSocialOfferPolicy(offers.baseline);
export const BASE_SOCIAL_OFFERS = offers.baseline;
