import { BetaAnalyticsDataClient } from '@google-analytics/data';
import dotenv from 'dotenv';

dotenv.config();

let analyticsDataClient = null;

try {
  analyticsDataClient = new BetaAnalyticsDataClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  });
  console.log('✅ Google Analytics configured');
} catch (error) {
  console.warn('⚠️  Google Analytics not configured:', error.message);
}

export const ga4PropertyId = process.env.GA4_PROPERTY_ID;
export default analyticsDataClient;
