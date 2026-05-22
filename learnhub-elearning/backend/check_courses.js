import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

mongoose.connect(uri).then(async () => {
  const db = mongoose.connection.db;
  const courses = await db.collection('courses').find({}).toArray();
  console.log('Total courses:', courses.length);
  courses.forEach(c => {
    console.log(`Title: ${c.title} | Status: ${c.status} | Type: ${c.type}`);
  });
  process.exit(0);
}).catch(console.error);
