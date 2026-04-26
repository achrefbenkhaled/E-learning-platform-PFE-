import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
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
  },
  { timestamps: true }
);

CourseSchema.index({ status: 1, createdAt: -1 });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ category: 1 });

export default mongoose.model('Course', CourseSchema);
