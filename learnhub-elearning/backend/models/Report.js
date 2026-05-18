import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  contentType: {
    type: String,
    enum: ['user', 'post', 'comment', 'chat', 'course'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentSnapshot: {
    type: String
  },
  reason: {
    type: String,
    required: true,
    enum: ['Harassment', 'Spam', 'Inappropriate Content', 'Hate Speech', 'Other']
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

const Report = mongoose.model('Report', reportSchema);
export default Report;
