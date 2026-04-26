import mongoose from 'mongoose';

const EnrollmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    enrollmentDate: { type: Date, default: Date.now },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedSessions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Session' }],
    lastAccessedAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'completed', 'paused'], default: 'active' },
    certificateEarned: { type: Boolean, default: false },
    certificateEarnedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EnrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export default mongoose.model('Enrollment', EnrollmentSchema);
