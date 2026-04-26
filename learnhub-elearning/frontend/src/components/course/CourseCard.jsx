import { useNavigate } from 'react-router-dom';
import { Clock, BookOpen, Star, Users } from 'lucide-react';

const CourseCard = ({ course, onClick }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => onClick ? onClick() : navigate(`/courses/${course._id}`)}
      className="card p-5 cursor-pointer group hover:shadow-brutal transition-all duration-300"
    >
      {/* Thumbnail or placeholder */}
      <div className="relative h-40 rounded-xl bg-surface border border-bdr mb-4 overflow-hidden flex items-center justify-center">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <BookOpen className="w-10 h-10 text-txt-muted" />
        )}
        {/* Price badge */}
        <div className="absolute top-3 right-3">
          <span className={`px-3 py-1 text-xs font-bold rounded-lg border-2 ${
            course.price === 0
              ? 'bg-green-400/10 text-green-400 border-green-400/30'
              : 'bg-yellow-400 text-black border-black'
          }`}>
            {course.price === 0 ? 'Free' : `$${course.price}`}
          </span>
        </div>
      </div>

      {/* Level badge */}
      <div className="mb-2">
        <span className="badge badge-accent">{course.level || 'Beginner'}</span>
      </div>

      {/* Title */}
      <h3 className="text-lg font-bold text-txt group-hover:text-yellow-400 transition-colors mb-2 line-clamp-1">
        {course.title}
      </h3>
      <p className="text-txt-muted text-sm mb-4 line-clamp-2">{course.description}</p>

      {/* Meta */}
      <div className="flex items-center gap-4 text-xs text-txt-muted mb-4">
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {course.totalSessions || 0} sessions</span>
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.totalEnrollments || 0}</span>
        {course.rating > 0 && (
          <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3.5 h-3.5 fill-current" /> {course.rating?.toFixed(1)}</span>
        )}
      </div>

      {/* Instructor */}
      <div className="flex items-center gap-2 pt-3 border-t border-bdr">
        <div className="w-6 h-6 rounded-md bg-yellow-400/10 flex items-center justify-center text-yellow-400 text-[10px] font-bold">
          {course.instructor?.firstName?.charAt(0) || '?'}
        </div>
        <span className="text-xs text-txt-secondary">{course.instructor?.firstName} {course.instructor?.lastName}</span>
      </div>
    </div>
  );
};

export default CourseCard;
