import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 10000, // Increase to 10s for better reliability with Atlas
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000, // Check connection every 10s
    });
    console.log(`✓ MongoDB connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error(`✗ MongoDB runtime error: ${err.message}`);
      if (err.message.includes('topology was destroyed')) {
        console.log('Reconnecting to MongoDB...');
      }
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('! MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✓ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error(`✗ DB connection failed: ${error.message}`);
    // Instead of exiting, we could retry, but for dev, exit is safer to show there's an issue
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('✓ MongoDB connection closed due to app termination');
  process.exit(0);
});

export default connectDB;
