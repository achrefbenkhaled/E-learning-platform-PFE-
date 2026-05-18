import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    categories: [{ type: String }],
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    thumbnail: { type: String, default: null },
    price: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    language: { type: String, default: 'English' },
    totalSessions: { type: Number, default: 0 },
    totalEnrollments: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviews: [{ userId: mongoose.Schema.Types.ObjectId, rating: Number, comment: String }],
    finalTestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', default: null },
    type: { type: String, enum: ['standard', 'classroom'], default: 'standard' },
    classCode: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

CourseSchema.index({ status: 1, createdAt: -1 });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ categories: 1 });

export default mongoose.model('Course', CourseSchema);
