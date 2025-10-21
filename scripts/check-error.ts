import { MongoClient } from 'mongodb';

const DATABASE_URL = 'mongodb://muzo_app:412f95d9c60E%24@mongo.aleou.app:443/muzo?replicaSet=rs0&directConnection=true&retryWrites=true&tls=true&tlsAllowInvalidCertificates=true&serverSelectionTimeoutMS=5000';

async function main() {
  const client = new MongoClient(DATABASE_URL);
  
  try {
    await client.connect();
    const job = await client.db().collection('Job').findOne({ _id: '68f8116352d31ae409129881' });
    
    console.log('❌ Job Error Details:\n');
    console.log(JSON.stringify(job?.error, null, 2));
  } finally {
    await client.close();
  }
}

main();
