import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    pdfUrl: { type: String, default: null },
    order: { type: Number, required: true },
    duration: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', default: null },
  },
  { timestamps: true }
);

SessionSchema.index({ courseId: 1, order: 1 });

export default mongoose.model('Session', SessionSchema);
