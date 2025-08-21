import { serve } from 'inngest/next';
import { inngest } from '../../../inngest/client';
import { mediaSrcFetch, populateMediaDetails } from '~/inngest/functions';

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [populateMediaDetails, mediaSrcFetch],
  signingKey: process.env.INNGEST_SIGNING_KEY,
});
