import { getGenerationQueue } from './generation.js';
import { getMockupQueue } from './mockup.js';
import { getFulfillmentQueue } from './fulfillment.js';

export async function initQueues() {
  const generationQueue = getGenerationQueue();
  const mockupQueue = getMockupQueue();
  const fulfillmentQueue = getFulfillmentQueue();

  await Promise.all([
    generationQueue.waitUntilReady(),
    mockupQueue.waitUntilReady(),
    fulfillmentQueue.waitUntilReady(),
  ]);
}
