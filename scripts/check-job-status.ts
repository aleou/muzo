/**
 * Check fulfillment job status in database using MongoDB directly
 */
import { MongoClient } from 'mongodb';

const DATABASE_URL = 'mongodb://muzo_app:412f95d9c60E%24@mongo.aleou.app:443/muzo?replicaSet=rs0&directConnection=true&retryWrites=true&tls=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=5000';

async function main() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const db = client.db();
    
    console.log('🔍 Checking recent fulfillment jobs...\n');
    
    // Get recent jobs
    const jobs = await db.collection('Job').find({
      type: 'FULFILLMENT',
    }).sort({ createdAt: -1 }).limit(5).toArray();

    if (jobs.length === 0) {
      console.log('❌ No fulfillment jobs found');
      return;
    }

    console.log(`✅ Found ${jobs.length} recent jobs:\n`);

    for (const job of jobs) {
      const statusEmoji = job.status === 'SUCCESS' ? '✅' : 
                         job.status === 'FAILED' ? '❌' : 
                         job.status === 'RETRYING' ? '🔄' : '⏳';
      
      console.log(`${statusEmoji} Job ${job._id}`);
      console.log(`   Status: ${job.status}`);
      console.log(`   Attempts: ${job.attempts}`);
      
      // Get associated order
      if (job.payload?.order?.orderId) {
        const order = await db.collection('Order').findOne({ _id: job.payload.order.orderId });
        if (order) {
          console.log(`   Order ID: ${order._id}`);
          console.log(`   Provider Order ID: ${order.providerOrderId || 'Pending...'}`);
          console.log(`   Order Status: ${order.status}`);
        }
      }
      
      console.log(`   Created: ${job.createdAt}`);
      
      if (job.error) {
        console.log(`   Error: ${JSON.stringify(job.error).substring(0, 100)}...`);
      }
      
      console.log('');
    }

    // Check latest order
    const latestOrder = await db.collection('Order').find().sort({ createdAt: -1 }).limit(1).toArray();

    if (latestOrder.length > 0) {
      const order = latestOrder[0];
      console.log(`\n📦 Latest order:`);
      console.log(`   ID: ${order._id}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Provider: ${order.provider}`);
      console.log(`   Provider Order ID: ${order.providerOrderId || 'Pending...'}`);
      console.log(`   Tracking: ${order.trackingNumber || 'N/A'}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Updated: ${order.updatedAt}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

main();
